import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError, ConflictError } from "@/lib/errors";
import { checkoutSchema } from "@/lib/validations/order";
import {
  loadCart,
  reclaimExpiredReservations,
  activeReservedFor,
} from "@/lib/cart";
import { applyCoupon } from "@/lib/coupons";
import { validateGiftCard, redeemGiftCard } from "@/lib/gift-cards";
import { resolveShippingCost, getShippingMethod, COD_FEE } from "@/lib/shipping";
import { getEffectivePrice } from "@/lib/flash-sales";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import {
  APP_URL,
  GIFT_WRAP_FEE,
  COD_AUTO_CONFIRM_THRESHOLD,
} from "@/lib/constants";
import { generateOrderNumber } from "@/lib/utils";
import {
  convertPrice,
  ronPerUnit,
  type Currency,
} from "@/lib/currency";
import { AFFILIATE_COOKIE, recordConversion } from "@/lib/affiliate";
import { awardPurchaseRewards } from "@/lib/order-rewards";
import { getActiveWholesaleAccount } from "@/lib/wholesale";
import {
  sendOrderConfirmation,
  type OrderEmailData,
  type OrderEmailShippingAddress,
} from "@/lib/resend";

export const runtime = "nodejs";

const round2 = (n: number) => Math.round(n * 100) / 100;

// POST /api/checkout — validate the cart, price the order (server-authoritative)
// and either open a Stripe Checkout Session (CARD) or persist a ramburs order
// directly (COD). All pricing is computed in RON, then converted to the
// customer's chosen currency, whose rate is snapshotted on the order.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const input = checkoutSchema.parse(await req.json());
    const currency: Currency = input.currency;
    const isCod = input.paymentMethod === "COD";

    // Release any lapsed reservations before validating availability.
    const existingCart = await db.cart.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existingCart) {
      await db.$transaction((tx) =>
        reclaimExpiredReservations(tx, { cartId: existingCart.id }),
      );
    }

    const cart = await loadCart(user.id);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError("Coșul este gol");
    }

    // Active B2B wholesale account: B2B contract pricing overrides flash sales.
    const wholesale = await getActiveWholesaleAccount(user.id);
    const wholesaleRate = wholesale?.discountRate.toNumber() ?? 0;

    // ---- Re-validate stock & compute subtotal in RON (authoritative) -------
    // Prices are resolved through `getEffectivePrice` so any live flash sale is
    // honoured here, never trusting a client-supplied amount.
    const unitPricesRon = new Map<string, number>();
    let subtotal = 0;
    for (const item of cart.items) {
      if (!item.variant.isActive) {
        throw new ConflictError(
          `"${item.variant.perfume.name}" nu mai este disponibil`,
        );
      }
      const onHand = item.variant.inventory?.quantity ?? 0;
      if (onHand < item.quantity) {
        throw new ConflictError(
          `Stoc insuficient pentru "${item.variant.perfume.name}" (${item.variant.sizeML.toString()} ml)`,
        );
      }
      const effective = await getEffectivePrice(
        item.variantId,
        item.variant.price,
      );
      // Wholesale buyers pay retail × (1 − discountRate), server-authoritative.
      const unitPrice = wholesale
        ? round2(item.variant.price.toNumber() * (1 - wholesaleRate))
        : effective.price.toNumber();
      unitPricesRon.set(item.variantId, unitPrice);
      subtotal += unitPrice * item.quantity;
    }
    subtotal = round2(subtotal);

    // ---- Coupon, gift wrap, ramburs fee, gift card & shipping (RON) --------
    const coupon = input.couponCode
      ? await applyCoupon(input.couponCode, subtotal)
      : null;
    const couponDiscount = coupon?.discount ?? 0;

    const shippingMethod = getShippingMethod(input.shippingMethod);
    const shippingCost = resolveShippingCost(input.shippingMethod, subtotal);
    const giftWrapFee = input.giftWrap ? GIFT_WRAP_FEE : 0;
    const codFee = isCod ? COD_FEE : 0;

    const goodsSubtotal = round2(subtotal + giftWrapFee);

    // COD has no payment processor, so the gift card may zero out the goods.
    // CARD keeps a 2 RON floor (unless shipping carries the charge) so Stripe
    // always has a non-zero amount to capture.
    const STRIPE_MIN = 2;
    const maxTotalDiscount = isCod
      ? goodsSubtotal
      : round2(goodsSubtotal - (shippingCost > 0 ? 0 : STRIPE_MIN));

    let giftCard: Awaited<ReturnType<typeof validateGiftCard>>["card"] | null =
      null;
    let giftCardDiscount = 0;
    if (input.giftCardCode) {
      const giftCardCap = Math.max(0, maxTotalDiscount - couponDiscount);
      const result = await validateGiftCard(input.giftCardCode, giftCardCap);
      giftCard = result.card;
      giftCardDiscount = result.maxRedeemable;
    }

    const discount = round2(
      Math.min(couponDiscount + giftCardDiscount, maxTotalDiscount),
    );
    const totalRon = round2(goodsSubtotal + shippingCost + codFee - discount);
    const orderNumber = generateOrderNumber();

    // ---- Currency conversion (RON → chosen currency) -----------------------
    const exchangeRate = ronPerUnit(currency); // RON per 1 unit of `currency`
    const toCur = (ron: number) => convertPrice(ron, "RON", currency);
    const subtotalCur = toCur(subtotal);
    const shippingCur = toCur(shippingCost + codFee);
    const discountCur = toCur(discount);
    const totalCur = toCur(totalRon);

    // Affiliate attribution from the visitor's cookie (first-touch).
    const affiliateCode = cookies().get(AFFILIATE_COOKIE)?.value?.trim() || null;

    // ======================================================================
    //  COD (Ramburs) — persist the order directly, no payment processor.
    // ======================================================================
    if (isCod) {
      // Large orders defer the stock deduction until an admin confirms, to limit
      // exposure to fraudulent high-value ramburs orders.
      const deductNow = totalRon <= COD_AUTO_CONFIRM_THRESHOLD;
      const itemCurrency = currency;

      const orderItemsData = cart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        priceAtPurchase: convertPrice(
          unitPricesRon.get(item.variantId) ?? item.variant.price.toNumber(),
          "RON",
          itemCurrency,
        ),
        sizeMLAtPurchase: item.variant.sizeML,
        perfumeNameAtPurchase: item.variant.perfume.name,
        houseNameAtPurchase: item.variant.perfume.house.name,
      }));

      const order = await db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            status: OrderStatus.PENDING_COD,
            paymentMethod: PaymentMethod.COD,
            subtotal: subtotalCur,
            shippingCost: shippingCur,
            discount: discountCur,
            total: totalCur,
            currency,
            exchangeRate,
            affiliateCode,
            isWholesale: Boolean(wholesale),
            wholesaleAccountId: wholesale?.id ?? null,
            stockDeducted: deductNow,
            couponCodeId: coupon?.id ?? null,
            giftCardId: giftCard?.id ?? null,
            giftCardDiscount: toCur(giftCardDiscount),
            giftWrap: input.giftWrap ?? false,
            giftWrapMessage: input.giftWrap
              ? input.giftWrapMessage ?? null
              : null,
            shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
            notes: input.notes || null,
            items: { create: orderItemsData },
          },
        });

        // Redeem the gift card against this order (atomic, double-spend safe).
        if (giftCard && giftCardDiscount > 0) {
          await redeemGiftCard(giftCard.code, created.id, giftCardDiscount, tx);
        }

        // Release the cart reservations; deduct stock only when auto-confirming.
        for (const item of cart.items) {
          const reserved = activeReservedFor(item);
          if (reserved > 0) {
            await tx.inventory.updateMany({
              where: { variantId: item.variantId },
              data: { reservedQuantity: { decrement: reserved } },
            });
          }
          if (deductNow) {
            await tx.inventory.updateMany({
              where: { variantId: item.variantId },
              data: { quantity: { decrement: item.quantity } },
            });
          }
        }
        await tx.inventory.updateMany({
          where: { quantity: { lt: 0 } },
          data: { quantity: 0 },
        });
        await tx.inventory.updateMany({
          where: { reservedQuantity: { lt: 0 } },
          data: { reservedQuantity: 0 },
        });

        if (coupon?.id) {
          await tx.couponCode.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } },
          });
        }

        // Empty the cart.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return created;
      });

      // Affiliate conversion + loyalty/referral rewards (best-effort).
      if (affiliateCode) {
        try {
          await recordConversion(order.id, affiliateCode);
        } catch (err) {
          console.error("[Checkout COD] affiliate conversion failed:", err);
        }
      }
      await awardPurchaseRewards(user.id, order.id, totalRon);

      // Confirmation email (best-effort).
      try {
        const address = input.shippingAddress as OrderEmailShippingAddress;
        const emailData: OrderEmailData = {
          orderNumber,
          customerName:
            `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
            address.name ||
            "client",
          items: cart.items.map((item) => ({
            perfumeName: item.variant.perfume.name,
            houseName: item.variant.perfume.house.name,
            sizeML: item.variant.sizeML.toNumber(),
            quantity: item.quantity,
            unitPrice: toCur(
              unitPricesRon.get(item.variantId) ??
                item.variant.price.toNumber(),
            ),
          })),
          subtotal: subtotalCur,
          shippingCost: shippingCur,
          discount: discountCur,
          total: totalCur,
          currency,
          shippingAddress: address,
          giftWrap: input.giftWrap ?? false,
          giftWrapFee: input.giftWrap ? toCur(giftWrapFee) : 0,
        };
        await sendOrderConfirmation(user.email, emailData, "COD");
      } catch (err) {
        console.error("[Checkout COD] confirmation email failed:", err);
      }

      return apiSuccess({
        type: "cod" as const,
        orderId: order.id,
        orderNumber,
        amount: totalCur,
        currency,
      });
    }

    // ======================================================================
    //  CARD — open a Stripe Checkout Session in the chosen currency.
    // ======================================================================
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      cart.items.map((item) => {
        const image = item.variant.perfume.images[0]?.url;
        const unitRon =
          unitPricesRon.get(item.variantId) ?? item.variant.price.toNumber();
        return {
          quantity: item.quantity,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: formatAmountForStripe(toCur(unitRon), currency),
            product_data: {
              name: `${item.variant.perfume.name} — ${item.variant.sizeML.toString()} ml`,
              description: item.variant.perfume.house.name,
              ...(image ? { images: [image] } : {}),
              metadata: { variantId: item.variantId },
            },
          },
        };
      });

    if (giftWrapFee > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: formatAmountForStripe(toCur(giftWrapFee), currency),
          product_data: {
            name: "Împachetare premium",
            description: "Cutie cadou elegantă cu mesaj personalizat",
          },
        },
      });
    }

    // Discount as an ephemeral one-time Stripe coupon.
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (discount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: formatAmountForStripe(discountCur, currency),
        currency: currency.toLowerCase(),
        duration: "once",
        name: coupon?.code ?? "Reducere",
      });
      discounts = [{ coupon: stripeCoupon.id }];
    }

    const metadata: Record<string, string> = {
      userId: user.id,
      cartId: cart.id,
      orderNumber,
      paymentMethod: "CARD",
      couponCodeId: coupon?.id ?? "",
      subtotal: subtotalCur.toFixed(2),
      discount: discountCur.toFixed(2),
      shippingCost: shippingCur.toFixed(2),
      total: totalCur.toFixed(2),
      totalRon: totalRon.toFixed(2),
      currency,
      exchangeRate: exchangeRate.toString(),
      shippingMethod: input.shippingMethod,
      shippingAddress: JSON.stringify(input.shippingAddress),
      notes: input.notes ?? "",
      giftCardId: giftCard?.id ?? "",
      giftCardCode: giftCard?.code ?? "",
      giftCardDiscount: toCur(giftCardDiscount).toFixed(2),
      giftWrap: input.giftWrap ? "1" : "0",
      giftWrapMessage: input.giftWrap ? (input.giftWrapMessage ?? "") : "",
      affiliateCode: affiliateCode ?? "",
      isWholesale: wholesale ? "1" : "0",
      wholesaleAccountId: wholesale?.id ?? "",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      discounts,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata,
      payment_intent_data: { metadata },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: formatAmountForStripe(shippingCur, currency),
              currency: currency.toLowerCase(),
            },
            display_name:
              shippingCur === 0
                ? "Transport gratuit"
                : `Livrare ${shippingMethod.label}`,
          },
        },
      ],
      success_url: `${APP_URL}/cont/comenzi?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cos?canceled=1`,
    });

    if (!session.url) {
      throw new Error("Stripe nu a returnat un URL de checkout");
    }

    return apiSuccess({
      type: "card" as const,
      sessionId: session.id,
      url: session.url,
      orderNumber,
      amount: totalCur,
      currency,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
