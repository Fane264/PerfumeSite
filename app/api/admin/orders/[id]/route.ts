import { NextRequest } from "next/server";
import { Prisma, OrderStatus, ConversionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateOrderSchema } from "@/lib/validations/order";
import { serializeOrder } from "@/lib/serializers";
import { sendShippingNotification } from "@/lib/resend";
import { updateConversionForOrderStatus } from "@/lib/affiliate";
import { generateAWB, isFanCourierEnabled } from "@/lib/fancourier";
import { sendPushToUser } from "@/lib/webpush";
import { toNumber } from "@/lib/utils";
import { orderArgs, type ShippingAddress } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// Statuses that represent a confirmed/realized order: stock should be deducted
// once an order reaches any of these (covers COD orders held until admin
// confirmation).
const REALIZED_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PAID_COD,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const RESTOCK_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

// PATCH /api/admin/orders/[id] — update status / tracking. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const order = await db.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
        paidAt: true,
        stockDeducted: true,
        items: { select: { variantId: true, quantity: true } },
      },
    });
    if (!order) return apiError("Comanda nu a fost găsită", 404);

    const input = updateOrderSchema.parse(await req.json());

    const data: Prisma.OrderUpdateInput = {};
    if (input.trackingNumber !== undefined)
      data.trackingNumber = input.trackingNumber;
    if (input.trackingUrl !== undefined) data.trackingUrl = input.trackingUrl;
    if (input.notes !== undefined) data.notes = input.notes;

    let deductStock = false;
    let restockOrder = false;

    if (input.status !== undefined) {
      data.status = input.status;
      // Stamp lifecycle timestamps on first transition.
      if (
        (input.status === OrderStatus.PAID ||
          input.status === OrderStatus.PAID_COD) &&
        !order.paidAt
      ) {
        data.paidAt = new Date();
      }
      if (input.status === OrderStatus.SHIPPED && !order.shippedAt) {
        data.shippedAt = new Date();
      }
      if (input.status === OrderStatus.DELIVERED && !order.deliveredAt) {
        data.deliveredAt = new Date();
      }

      // Deduct stock when a held order (e.g. large COD) is first confirmed.
      if (
        !order.stockDeducted &&
        REALIZED_STATUSES.includes(input.status)
      ) {
        deductStock = true;
        data.stockDeducted = true;
      }

      // Restore stock when cancelling/refunding a previously-deducted order.
      if (order.stockDeducted && RESTOCK_STATUSES.includes(input.status)) {
        restockOrder = true;
        data.stockDeducted = false;
      }
    }

    let updated = await db.$transaction(async (tx) => {
      if (deductStock) {
        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: { variantId: item.variantId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
        await tx.inventory.updateMany({
          where: { quantity: { lt: 0 } },
          data: { quantity: 0 },
        });
      }
      if (restockOrder) {
        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: { variantId: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
      return tx.order.update({ where: { id: order.id }, data, ...orderArgs });
    });

    // Advance/cancel any affiliate conversion to match the order lifecycle.
    if (input.status === OrderStatus.DELIVERED) {
      try {
        await updateConversionForOrderStatus(
          order.id,
          ConversionStatus.CONFIRMED,
        );
      } catch (err) {
        console.error("[Admin orders] affiliate confirm failed:", err);
      }
    } else if (
      input.status === OrderStatus.CANCELLED ||
      input.status === OrderStatus.REFUNDED
    ) {
      try {
        await updateConversionForOrderStatus(
          order.id,
          ConversionStatus.CANCELLED,
        );
      } catch (err) {
        console.error("[Admin orders] affiliate cancel failed:", err);
      }
    }

    // On first ship, auto-generate a FanCourier AWB when none exists yet.
    if (
      input.status === OrderStatus.SHIPPED &&
      !updated.trackingNumber &&
      isFanCourierEnabled()
    ) {
      try {
        const address = updated.shippingAddress as unknown as ShippingAddress;
        if (address?.name && address?.phone) {
          const units = updated.items.reduce((sum, i) => sum + i.quantity, 0);
          const weight = Math.max(0.5, Math.round(units * 0.12 * 10) / 10);
          const isCodOutstanding =
            updated.paymentMethod === "COD" &&
            updated.status !== OrderStatus.PAID_COD;
          const awb = await generateAWB({
            recipientName: address.name,
            recipientPhone: address.phone,
            recipientAddress: [address.line1, address.line2]
              .filter(Boolean)
              .join(", "),
            recipientCity: address.city,
            recipientCounty: address.county,
            recipientPostalCode: address.postalCode,
            packageCount: 1,
            weight,
            codAmount: isCodOutstanding ? toNumber(updated.total) : 0,
            orderReference: updated.orderNumber,
            observations: `Comanda ${updated.orderNumber}`,
          });
          updated = await db.order.update({
            where: { id: updated.id },
            data: {
              trackingNumber: awb.awbNumber,
              trackingUrl: awb.trackingUrl,
            },
            ...orderArgs,
          });
        }
      } catch (err) {
        console.error("[Admin orders] AWB auto-generation failed:", err);
      }
    }

    // Notify the customer when the order ships and we have a tracking number.
    if (input.status === OrderStatus.SHIPPED && updated.trackingNumber) {
      try {
        const customerName =
          `${updated.user.firstName ?? ""} ${updated.user.lastName ?? ""}`.trim() ||
          "client";
        await sendShippingNotification(updated.user.email, {
          orderNumber: updated.orderNumber,
          customerName,
          trackingNumber: updated.trackingNumber,
          trackingUrl: updated.trackingUrl,
        });
      } catch (err) {
        console.error("[Admin orders] shipping email failed:", err);
      }
      // Push: "your order is on its way".
      try {
        await sendPushToUser(updated.userId, {
          title: "Comanda ta a plecat!",
          body: `AWB: ${updated.trackingNumber}`,
          url: "/cont/comenzi",
        });
      } catch (err) {
        console.error("[Admin orders] shipping push failed:", err);
      }
    }

    return apiSuccess(serializeOrder(updated, { includeCustomer: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
