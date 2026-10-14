import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { giftCardPurchaseSchema } from "@/lib/validations/gift-card";
import { generateUniqueGiftCardCode } from "@/lib/gift-cards";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { DEFAULT_CURRENCY, APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

const round2 = (n: number) => Math.round(n * 100) / 100;

// POST /api/gift-cards/purchase — create an (inactive) gift card and open a
// Stripe Checkout Session. The card is activated + emailed by the Stripe
// webhook on `checkout.session.completed`.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const input = giftCardPurchaseSchema.parse(await req.json());
    const value = round2(input.value);
    const currency = DEFAULT_CURRENCY;

    const code = await generateUniqueGiftCardCode();
    const card = await db.giftCard.create({
      data: {
        code,
        initialValue: value,
        remainingValue: value,
        currency,
        purchasedByUserId: user.id,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        personalMessage: input.personalMessage ?? null,
        isActive: false,
      },
    });

    const metadata: Record<string, string> = {
      type: "gift_card",
      giftCardId: card.id,
      userId: user.id,
      value: value.toFixed(2),
      currency,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: formatAmountForStripe(value, currency),
            product_data: {
              name: `Card cadou DecantLux — ${value.toFixed(0)} ${currency}`,
              description: `Pentru ${input.recipientName}`,
            },
          },
        },
      ],
      success_url: `${APP_URL}/cadou/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cadou?canceled=1`,
    });

    if (!session.url) {
      throw new Error("Stripe nu a returnat un URL de checkout");
    }

    return apiSuccess({ url: session.url, sessionId: session.id, code: card.code });
  } catch (error) {
    return handleApiError(error);
  }
}
