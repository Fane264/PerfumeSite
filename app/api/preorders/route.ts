import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { preOrderSchema } from "@/lib/validations/waitlist";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

// POST /api/preorders — open a Stripe Checkout Session for a pre-order of a
// variant whose perfume has `preOrderOpen = true`. Pricing is RON, resolved
// server-side from the variant. Body: { variantId, quantity }
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const { variantId, quantity } = preOrderSchema.parse(await req.json());

    const variant = await db.decantVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        price: true,
        sizeML: true,
        isActive: true,
        perfume: {
          select: {
            name: true,
            slug: true,
            preOrderOpen: true,
            launchDate: true,
            house: { select: { name: true } },
            images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
          },
        },
      },
    });

    if (!variant || !variant.isActive) {
      return apiError("Varianta nu a fost găsită", 404);
    }
    if (!variant.perfume.preOrderOpen) {
      throw new BadRequestError("Precomanda nu este disponibilă pentru acest parfum");
    }

    const unitAmount = variant.price.toNumber();
    const image = variant.perfume.images[0]?.url;

    // Create the PENDING pre-order first so we can carry its id in metadata.
    const preOrder = await db.preOrder.create({
      data: {
        userId: user.id,
        variantId: variant.id,
        quantity,
        expectedDate: variant.perfume.launchDate,
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "ron",
            unit_amount: formatAmountForStripe(unitAmount, "RON"),
            product_data: {
              name: `${variant.perfume.name} — ${variant.sizeML.toString()} ml (Precomandă)`,
              description: variant.perfume.house.name,
              ...(image ? { images: [image] } : {}),
            },
          },
        },
      ],
      metadata: {
        type: "preorder",
        preOrderId: preOrder.id,
        userId: user.id,
      },
      payment_intent_data: {
        metadata: { type: "preorder", preOrderId: preOrder.id, userId: user.id },
      },
      success_url: `${APP_URL}/cont/precomenzile-mele?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/parfumuri/${variant.perfume.slug}?preorder_canceled=1`,
    });

    if (!session.url) {
      throw new Error("Stripe nu a returnat un URL de checkout");
    }

    await db.preOrder.update({
      where: { id: preOrder.id },
      data: { stripeSessionId: session.id },
    });

    return apiSuccess({ sessionUrl: session.url, sessionId: session.id });
  } catch (error) {
    return handleApiError(error);
  }
}
