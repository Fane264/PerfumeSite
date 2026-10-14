import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { subscribeSchema } from "@/lib/validations/subscription";
import { createSubscriptionSession } from "@/lib/stripe";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

// POST /api/subscription/subscribe — open a Stripe subscription checkout for the
// chosen plan. The Subscription row is persisted by the webhook. Auth required.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const { planId, preferences } = subscribeSchema.parse(await req.json());

    // One active subscription per user.
    const existing = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });
    if (existing && existing.status === "ACTIVE") {
      throw new ConflictError("Ai deja un abonament activ");
    }

    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundError("Planul selectat nu este disponibil");
    }
    if (plan.stripePriceId.startsWith("price_") === false && !plan.stripePriceId) {
      throw new BadRequestError("Planul nu este configurat pentru plată");
    }

    const session = await createSubscriptionSession(
      user.id,
      user.email,
      plan.stripePriceId,
      preferences ?? {},
      `${APP_URL}/cont/abonament?success=1`,
      `${APP_URL}/abonament?canceled=1`,
    );

    if (!session.url) {
      throw new Error("Stripe nu a returnat un URL de checkout");
    }

    return apiSuccess({ url: session.url, sessionId: session.id });
  } catch (error) {
    return handleApiError(error);
  }
}
