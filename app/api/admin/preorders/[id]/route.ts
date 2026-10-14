import { NextRequest } from "next/server";
import { Prisma, OrderStatus, PaymentMethod, PreOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { updatePreOrderSchema } from "@/lib/validations/waitlist";
import { stripe } from "@/lib/stripe";
import { generateOrderNumber } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/preorders/[id] — FULFILLED converts a paid pre-order into a
// real order; CANCELLED issues an automatic Stripe refund. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { status } = updatePreOrderSchema.parse(await req.json());

    const preOrder = await db.preOrder.findUnique({
      where: { id: params.id },
      include: {
        variant: {
          select: {
            id: true,
            price: true,
            sizeML: true,
            perfume: {
              select: { name: true, house: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!preOrder) return apiError("Precomanda nu a fost găsită", 404);

    // ---- FULFILLED → create a real order from the pre-order ---------------
    if (status === "FULFILLED") {
      if (preOrder.status !== PreOrderStatus.PAID) {
        throw new BadRequestError(
          "Doar precomenzile achitate (PAID) pot fi marcate ca livrate",
        );
      }

      // Reuse the customer's most recent shipping address, if any.
      const lastOrder = await db.order.findFirst({
        where: { userId: preOrder.userId },
        orderBy: { createdAt: "desc" },
        select: { shippingAddress: true },
      });
      const shippingAddress = (lastOrder?.shippingAddress ?? {}) as Prisma.InputJsonValue;

      const unitPrice = preOrder.variant.price;
      const total = unitPrice.mul(preOrder.quantity);

      const order = await db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: preOrder.userId,
            status: OrderStatus.PROCESSING,
            paymentMethod: PaymentMethod.CARD,
            subtotal: total,
            shippingCost: 0,
            discount: 0,
            total,
            currency: "RON",
            exchangeRate: 1,
            stockDeducted: false,
            shippingAddress,
            notes: `Precomandă onorată (#${preOrder.id})`,
            paidAt: new Date(),
            items: {
              create: {
                variantId: preOrder.variantId,
                quantity: preOrder.quantity,
                priceAtPurchase: unitPrice,
                sizeMLAtPurchase: preOrder.variant.sizeML,
                perfumeNameAtPurchase: preOrder.variant.perfume.name,
                houseNameAtPurchase: preOrder.variant.perfume.house.name,
              },
            },
          },
        });
        await tx.preOrder.update({
          where: { id: preOrder.id },
          data: { status: PreOrderStatus.FULFILLED, fulfilledAt: new Date() },
        });
        return created;
      });

      return apiSuccess({
        preOrderId: preOrder.id,
        status: PreOrderStatus.FULFILLED,
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    }

    // ---- CANCELLED → refund (if paid) and mark cancelled ------------------
    if (preOrder.status === PreOrderStatus.CANCELLED) {
      return apiSuccess({ preOrderId: preOrder.id, status: PreOrderStatus.CANCELLED });
    }

    let refunded = false;
    if (preOrder.status === PreOrderStatus.PAID && preOrder.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          preOrder.stripeSessionId,
        );
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
          refunded = true;
        }
      } catch (err) {
        console.error("[PreOrder cancel] refund failed:", err);
      }
    }

    await db.preOrder.update({
      where: { id: preOrder.id },
      data: { status: PreOrderStatus.CANCELLED },
    });

    return apiSuccess({
      preOrderId: preOrder.id,
      status: PreOrderStatus.CANCELLED,
      refunded,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
