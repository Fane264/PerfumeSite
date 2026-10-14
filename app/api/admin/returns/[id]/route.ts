import { NextRequest } from "next/server";
import { CouponType, Prisma, ReturnStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateReturnSchema } from "@/lib/validations/return";
import { returnInclude, serializeReturn, generateReturnNumber } from "@/lib/returns";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { ronPerUnit, isSupportedCurrency, type Currency } from "@/lib/currency";
import {
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
  sendReturnRefundedEmail,
} from "@/lib/resend";
import { toNumber } from "@/lib/utils";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

const RESOLVED_STATUSES: ReturnStatus[] = [
  ReturnStatus.REFUNDED,
  ReturnStatus.REJECTED,
];

function generateVoucherCode(): string {
  return `RET-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// PATCH /api/admin/returns/[id] — transition a return; handle refunds. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const input = updateReturnSchema.parse(await req.json());

    const existing = await db.returnRequest.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            id: true,
            currency: true,
            exchangeRate: true,
            stripePaymentIntentId: true,
          },
        },
        user: { select: { email: true, firstName: true, lastName: true } },
        items: { select: { orderItemId: true, quantity: true } },
      },
    });
    if (!existing) return apiError("Returul nu a fost găsit", 404);

    const data: Prisma.ReturnRequestUpdateInput = {};
    if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes;
    if (input.refundMethod !== undefined) data.refundMethod = input.refundMethod;
    if (input.trackingNumber !== undefined)
      data.trackingNumber = input.trackingNumber;
    if (input.refundAmount !== undefined)
      data.refundAmount = new Prisma.Decimal(input.refundAmount);

    const newStatus = input.status;
    const customerName =
      [existing.user.firstName, existing.user.lastName]
        .filter(Boolean)
        .join(" ") || "client";
    const returnNumber = generateReturnNumber(existing.id);

    let voucherCode: string | null = null;

    // ---- Refund handling (idempotent: only on first transition to REFUNDED) --
    const becomingRefunded =
      newStatus === ReturnStatus.REFUNDED &&
      existing.status !== ReturnStatus.REFUNDED;

    if (becomingRefunded) {
      const method =
        input.refundMethod ?? (existing.refundMethod as "card" | "voucher" | null) ?? "card";
      const amount =
        input.refundAmount ??
        (existing.refundAmount ? toNumber(existing.refundAmount) : 0);

      if (amount <= 0) {
        return apiError("Suma de rambursat trebuie să fie pozitivă", 422);
      }

      const orderCurrency = existing.order.currency;

      if (method === "card") {
        if (!existing.order.stripePaymentIntentId) {
          return apiError(
            "Comanda nu are o plată cu cardul de rambursat (folosește voucher)",
            422,
          );
        }
        try {
          await stripe.refunds.create({
            payment_intent: existing.order.stripePaymentIntentId,
            amount: formatAmountForStripe(amount, orderCurrency),
          });
        } catch (err) {
          console.error("[admin/returns] Stripe refund failed:", err);
          return apiError("Rambursarea prin Stripe a eșuat", 502);
        }
      } else {
        // Voucher: a FIXED_AMOUNT coupon. Coupons are denominated in RON, so
        // convert the order-currency refund back to RON via the snapshot rate.
        const rateRonPerUnit = isSupportedCurrency(orderCurrency)
          ? ronPerUnit(orderCurrency as Currency)
          : toNumber(existing.order.exchangeRate);
        const valueRon = Math.round(amount * rateRonPerUnit * 100) / 100;
        voucherCode = generateVoucherCode();
        await db.couponCode.create({
          data: {
            code: voucherCode,
            type: CouponType.FIXED_AMOUNT,
            value: new Prisma.Decimal(valueRon),
            maxUsageCount: 1,
            isActive: true,
          },
        });
      }

      data.refundAmount = new Prisma.Decimal(amount);
      data.refundMethod = method;
    }

    if (newStatus !== undefined) {
      data.status = newStatus;
      if (RESOLVED_STATUSES.includes(newStatus) && !existing.resolvedAt) {
        data.resolvedAt = new Date();
      }
    }

    // ---- Persist update + restock returned inventory atomically -------------
    const updated = await db.$transaction(async (tx) => {
      if (becomingRefunded) {
        // Restore stock for the returned items (best-effort per variant).
        const orderItems = await tx.orderItem.findMany({
          where: { id: { in: existing.items.map((i) => i.orderItemId) } },
          select: { id: true, variantId: true },
        });
        const variantByItem = new Map(orderItems.map((o) => [o.id, o.variantId]));
        for (const item of existing.items) {
          const variantId = variantByItem.get(item.orderItemId);
          if (!variantId) continue;
          await tx.inventory.updateMany({
            where: { variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
      return tx.returnRequest.update({
        where: { id: existing.id },
        data,
        include: returnInclude,
      });
    });

    // ---- Customer notifications (best-effort) -------------------------------
    try {
      if (
        newStatus === ReturnStatus.APPROVED &&
        existing.status !== ReturnStatus.APPROVED
      ) {
        await sendReturnApprovedEmail(existing.user.email, {
          customerName,
          returnNumber,
        });
      } else if (
        newStatus === ReturnStatus.REJECTED &&
        existing.status !== ReturnStatus.REJECTED
      ) {
        await sendReturnRejectedEmail(existing.user.email, {
          customerName,
          returnNumber,
          reason: input.adminNotes ?? existing.adminNotes,
        });
      }
      if (becomingRefunded) {
        const refundedMethod =
          (updated.refundMethod as "card" | "voucher" | null) ?? "card";
        await sendReturnRefundedEmail(existing.user.email, {
          customerName,
          returnNumber,
          amount: updated.refundAmount ? toNumber(updated.refundAmount) : 0,
          currency: existing.order.currency,
          method: refundedMethod,
          voucherCode,
        });
      }
    } catch (err) {
      console.error("[admin/returns] notification failed:", err);
    }

    return apiSuccess(serializeReturn(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
