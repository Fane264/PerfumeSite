import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  SubscriptionStatus,
  BoxStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { loadCart, activeReservedFor } from "@/lib/cart";
import {
  sendOrderConfirmation,
  sendGiftCardEmail,
  sendPreOrderConfirmation,
  type OrderEmailData,
} from "@/lib/resend";
import { redeemGiftCard } from "@/lib/gift-cards";
import { getEffectivePrice, getFlashSaleForVariant } from "@/lib/flash-sales";
import { awardPurchaseRewards } from "@/lib/order-rewards";
import { recordConversion } from "@/lib/affiliate";
import { convertPrice, type Currency } from "@/lib/currency";
import { GIFT_WRAP_FEE } from "@/lib/constants";

// Stripe webhook. Must run on the Node runtime and read the raw body for
// signature verification.
export const runtime = "nodejs";

function num(value: string | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ----------------------------------------------------------------------------
//  checkout.session.completed → persist the order, deduct stock, clear cart.
// ----------------------------------------------------------------------------
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};

  // Gift card purchases are a distinct flow — no order, no stock movement.
  if (meta.type === "gift_card") {
    await handleGiftCardPurchase(session);
    return;
  }

  // Subscription checkouts are persisted by the `customer.subscription.*`
  // events, not here.
  if (meta.type === "subscription") {
    return;
  }

  // Pre-orders are a distinct flow — flip the pre-order to PAID, no cart/stock.
  if (meta.type === "preorder") {
    await handlePreOrderPaid(session);
    return;
  }

  const userId = meta.userId;
  if (!userId) {
    console.error("[Stripe webhook] session.completed without userId metadata");
    return;
  }

  // Idempotency — Stripe retries deliveries.
  const already = await db.order.findUnique({
    where: { stripeSessionId: session.id },
    select: { id: true },
  });
  if (already) return;

  const cart = await loadCart(userId);
  const items = cart?.items ?? [];

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  let shippingAddress: Prisma.InputJsonValue;
  try {
    shippingAddress = JSON.parse(meta.shippingAddress ?? "{}");
  } catch {
    shippingAddress = {};
  }

  const couponCodeId = meta.couponCodeId || null;
  const giftCardCode = meta.giftCardCode || null;
  const giftCardDiscount = num(meta.giftCardDiscount);
  const giftWrap = meta.giftWrap === "1";
  const orderCurrency = (meta.currency ?? session.currency ?? "RON").toUpperCase();
  const itemCurrency: Currency = orderCurrency === "EUR" ? "EUR" : "RON";

  // Wholesale orders are priced at the account's contract rate (B2B contract
  // pricing overrides flash sales), matching what checkout priced the session.
  const isWholesale = meta.isWholesale === "1";
  const wholesaleAccountId = meta.wholesaleAccountId || null;
  const wholesaleAccount =
    isWholesale && wholesaleAccountId
      ? await db.wholesaleAccount.findUnique({
          where: { id: wholesaleAccountId },
          select: { discountRate: true },
        })
      : null;
  const wholesaleRate = wholesaleAccount?.discountRate.toNumber() ?? 0;

  // Snapshot the price actually charged, matching what checkout priced the
  // Stripe session at, in the order's currency.
  const orderItemsData = await Promise.all(
    items.map(async (item) => {
      const effective = await getEffectivePrice(item.variantId, item.variant.price);
      const unitRon = wholesaleAccount
        ? Math.round(item.variant.price.toNumber() * (1 - wholesaleRate) * 100) /
          100
        : effective.price.toNumber();
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        priceAtPurchase: convertPrice(unitRon, "RON", itemCurrency),
        sizeMLAtPurchase: item.variant.sizeML,
        perfumeNameAtPurchase: item.variant.perfume.name,
        houseNameAtPurchase: item.variant.perfume.house.name,
      };
    }),
  );

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: meta.orderNumber ?? `DN-${session.id.slice(-6).toUpperCase()}`,
        userId,
        status: OrderStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        subtotal: num(meta.subtotal),
        shippingCost: num(meta.shippingCost),
        discount: num(meta.discount),
        total: num(meta.total, (session.amount_total ?? 0) / 100),
        currency: (meta.currency ?? session.currency ?? "RON").toUpperCase(),
        exchangeRate: num(meta.exchangeRate, 1),
        affiliateCode: meta.affiliateCode || null,
        isWholesale,
        wholesaleAccountId,
        stockDeducted: true,
        couponCodeId,
        giftCardDiscount,
        giftWrap,
        giftWrapMessage: giftWrap ? meta.giftWrapMessage || null : null,
        shippingAddress,
        notes: meta.notes || null,
        paidAt: new Date(),
        items: { create: orderItemsData },
      },
    });

    // Redeem the gift card against this order (atomic, double-spend safe). On
    // failure the whole order transaction rolls back so balances stay correct.
    if (giftCardCode && giftCardDiscount > 0) {
      await redeemGiftCard(giftCardCode, created.id, giftCardDiscount, tx);
      if (meta.giftCardId) {
        await tx.order.update({
          where: { id: created.id },
          data: { giftCardId: meta.giftCardId },
        });
      }
    }

    // Convert reservations into sales: subtract sold units and release the
    // matching reservation for each line.
    for (const item of items) {
      await tx.inventory.updateMany({
        where: { variantId: item.variantId },
        data: {
          quantity: { decrement: item.quantity },
          reservedQuantity: { decrement: item.quantity },
        },
      });
    }
    await tx.inventory.updateMany({
      where: { quantity: { lt: 0 } },
      data: { quantity: 0 },
    });
    await tx.inventory.updateMany({
      where: { reservedQuantity: { lt: 0 } },
      data: { reservedQuantity: 0 },
    });

    if (couponCodeId) {
      await tx.couponCode.update({
        where: { id: couponCodeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Empty the cart.
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return created;
  });

  // Track flash-sale units sold for the admin progress bars (best-effort).
  for (const item of items) {
    try {
      const sale = await getFlashSaleForVariant(item.variantId);
      if (sale) {
        await db.flashSaleProduct.update({
          where: { id: sale.id },
          data: { unitsSold: { increment: item.quantity } },
        });
      }
    } catch (err) {
      console.error("[Stripe webhook] flash-sale unitsSold update failed:", err);
    }
  }

  // Record the affiliate conversion (best-effort, idempotent on orderId).
  if (meta.affiliateCode) {
    try {
      await recordConversion(order.id, meta.affiliateCode);
    } catch (err) {
      console.error("[Stripe webhook] affiliate conversion failed:", err);
    }
  }

  // Loyalty points + referral completion (best-effort, post-commit). Points
  // scale on the RON total so EUR orders earn consistently.
  const totalRon = num(
    meta.totalRon,
    convertPrice(
      order.total.toNumber(),
      (order.currency as Currency) ?? "RON",
      "RON",
    ),
  );
  await awardPurchaseRewards(userId, order.id, totalRon);

  // Confirmation email (best-effort).
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (user?.email) {
      const emailData: OrderEmailData = {
        orderNumber: order.orderNumber,
        customerName:
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "client",
        items: items.map((item) => ({
          perfumeName: item.variant.perfume.name,
          houseName: item.variant.perfume.house.name,
          sizeML: item.variant.sizeML.toNumber(),
          quantity: item.quantity,
          unitPrice: convertPrice(
            item.variant.price.toNumber(),
            "RON",
            itemCurrency,
          ),
        })),
        subtotal: num(meta.subtotal),
        shippingCost: num(meta.shippingCost),
        discount: num(meta.discount),
        total: num(meta.total),
        currency: orderCurrency,
        shippingAddress: JSON.parse(meta.shippingAddress ?? "{}"),
        giftWrap,
        giftWrapFee: giftWrap
          ? convertPrice(GIFT_WRAP_FEE, "RON", itemCurrency)
          : 0,
      };
      await sendOrderConfirmation(user.email, emailData, "CARD");
    }
  } catch (err) {
    console.error("[Stripe webhook] order confirmation email failed:", err);
  }
}

// ----------------------------------------------------------------------------
//  Gift card purchase → activate the card and email the recipient.
// ----------------------------------------------------------------------------
async function handleGiftCardPurchase(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const giftCardId = meta.giftCardId;
  if (!giftCardId) {
    console.error("[Stripe webhook] gift_card session without giftCardId");
    return;
  }

  const card = await db.giftCard.findUnique({ where: { id: giftCardId } });
  if (!card) {
    console.error(`[Stripe webhook] gift card ${giftCardId} not found`);
    return;
  }
  // Idempotency — Stripe retries deliveries.
  if (card.isActive && card.deliveredAt) return;

  // Gift cards are valid for one year from activation.
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const activated = await db.giftCard.update({
    where: { id: card.id },
    data: {
      isActive: true,
      expiresAt: card.expiresAt ?? expiresAt,
      stripeSessionId: session.id,
      deliveredAt: new Date(),
    },
  });

  if (activated.recipientEmail) {
    try {
      const buyer = activated.purchasedByUserId
        ? await db.user.findUnique({
            where: { id: activated.purchasedByUserId },
            select: { firstName: true, lastName: true },
          })
        : null;
      const senderName = buyer
        ? `${buyer.firstName ?? ""} ${buyer.lastName ?? ""}`.trim() || null
        : null;
      await sendGiftCardEmail(activated.recipientEmail, {
        recipientName: activated.recipientName,
        senderName,
        value: activated.initialValue.toNumber(),
        code: activated.code,
        message: activated.personalMessage,
        currency: activated.currency,
        expiresAt: activated.expiresAt,
      });
    } catch (err) {
      console.error("[Stripe webhook] gift card email failed:", err);
    }
  }
}

// ----------------------------------------------------------------------------
//  Pre-order paid → flip PENDING → PAID and email the customer (idempotent).
// ----------------------------------------------------------------------------
async function handlePreOrderPaid(session: Stripe.Checkout.Session) {
  const preOrderId = session.metadata?.preOrderId;
  if (!preOrderId) {
    console.error("[Stripe webhook] preorder session without preOrderId");
    return;
  }

  const preOrder = await db.preOrder.findUnique({
    where: { id: preOrderId },
    include: {
      user: { select: { email: true } },
      variant: {
        select: { sizeML: true, perfume: { select: { name: true } } },
      },
    },
  });
  if (!preOrder) {
    console.error(`[Stripe webhook] preorder ${preOrderId} not found`);
    return;
  }
  // Idempotency — Stripe retries deliveries.
  if (preOrder.status !== "PENDING") return;

  await db.preOrder.update({
    where: { id: preOrder.id },
    data: { status: "PAID", stripeSessionId: session.id },
  });

  if (preOrder.user.email) {
    try {
      await sendPreOrderConfirmation(preOrder.user.email, {
        perfumeName: preOrder.variant.perfume.name,
        sizeML: preOrder.variant.sizeML.toNumber(),
        quantity: preOrder.quantity,
        expectedDate: preOrder.expectedDate,
      });
    } catch (err) {
      console.error("[Stripe webhook] pre-order email failed:", err);
    }
  }
}

// ----------------------------------------------------------------------------
//  payment_intent.payment_failed → release reserved stock.
// ----------------------------------------------------------------------------
async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const cartId = intent.metadata?.cartId;
  if (!cartId) return;

  await db.$transaction(async (tx) => {
    const items = await tx.cartItem.findMany({
      where: { cartId },
      select: { id: true, variantId: true, quantity: true, reservedUntil: true },
    });
    for (const item of items) {
      const reserved = activeReservedFor(item);
      if (reserved > 0) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: { reservedQuantity: { decrement: reserved } },
        });
      }
      await tx.cartItem.update({
        where: { id: item.id },
        data: { reservedUntil: null },
      });
    }
    await tx.inventory.updateMany({
      where: { reservedQuantity: { lt: 0 } },
      data: { reservedQuantity: 0 },
    });
  });
}

// ----------------------------------------------------------------------------
//  charge.refunded → mark order REFUNDED and restore inventory.
// ----------------------------------------------------------------------------
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);
  if (!paymentIntentId) return;

  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { items: true },
  });
  if (!order || order.status === OrderStatus.REFUNDED) return;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.REFUNDED },
    });
    for (const item of order.items) {
      await tx.inventory.updateMany({
        where: { variantId: item.variantId },
        data: { quantity: { increment: item.quantity } },
      });
    }
  });
}

// ----------------------------------------------------------------------------
//  Subscription discovery box lifecycle.
// ----------------------------------------------------------------------------
function mapSubscriptionStatus(sub: Stripe.Subscription): SubscriptionStatus {
  // A voided pause is surfaced as PAUSED in our model regardless of raw status.
  if (sub.pause_collection?.behavior) return SubscriptionStatus.PAUSED;
  switch (sub.status) {
    case "active":
    case "trialing":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
    case "incomplete":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "paused":
      return SubscriptionStatus.PAUSED;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELLED;
    default:
      return SubscriptionStatus.PAST_DUE;
  }
}

function subscriptionPriceId(sub: Stripe.Subscription): string | null {
  const price = sub.items.data[0]?.price;
  return price ? price.id : null;
}

/** Upsert the DB subscription from a Stripe subscription object (idempotent). */
async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.error("[Stripe webhook] subscription without userId metadata");
    return;
  }

  const priceId = subscriptionPriceId(sub);
  const plan = priceId
    ? await db.subscriptionPlan.findUnique({ where: { stripePriceId: priceId } })
    : null;
  if (!plan) {
    console.error(`[Stripe webhook] no plan for price ${priceId}`);
    return;
  }

  let preferences: Prisma.InputJsonValue | undefined;
  if (sub.metadata?.preferences) {
    try {
      preferences = JSON.parse(sub.metadata.preferences);
    } catch {
      preferences = undefined;
    }
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const status = mapSubscriptionStatus(sub);
  const periodStart = new Date(sub.current_period_start * 1000);
  const periodEnd = new Date(sub.current_period_end * 1000);

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      planId: plan.id,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      ...(preferences !== undefined ? { preferences } : {}),
    },
    update: {
      planId: plan.id,
      stripeCustomerId: customerId,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      ...(preferences !== undefined ? { preferences } : {}),
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: SubscriptionStatus.CANCELLED, cancelAtPeriodEnd: false },
  });
}

/** A renewal payment mints the month's discovery box (idempotent per month). */
async function handleSubscriptionInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription?.id ?? null);
  if (!subId) return;

  const subscription = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subId },
    select: { id: true },
  });
  if (!subscription) return;

  // "2026-06" — the billing month this invoice covers.
  const month = new Date(invoice.created * 1000).toISOString().slice(0, 7);

  await db.subscriptionBox.upsert({
    where: { subscriptionId_month: { subscriptionId: subscription.id, month } },
    create: {
      subscriptionId: subscription.id,
      month,
      status: BoxStatus.PREPARING,
    },
    update: {},
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Stripe webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { data: null, error: "Webhook indisponibil" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { data: null, error: "Semnătură lipsă" },
      { status: 400 },
    );
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[Stripe webhook] Signature verification failed:", error);
    return NextResponse.json(
      { data: null, error: "Semnătură invalidă" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        if (event.data.object.subscription) {
          await handleSubscriptionInvoicePaid(event.data.object);
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`[Stripe webhook] Error handling ${event.type}:`, error);
    return NextResponse.json(
      { data: null, error: "Eroare la procesarea evenimentului" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { received: true }, error: null });
}
