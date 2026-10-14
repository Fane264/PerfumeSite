import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { cancelSubscription } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/subscription/cancel — schedule cancellation at period end. Auth.
export async function POST() {
  try {
    const user = await requireAuth();
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!subscription) throw new NotFoundError("Nu ai un abonament activ");

    await cancelSubscription(subscription.stripeSubscriptionId);
    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    return apiSuccess({
      cancelAtPeriodEnd: true,
      endsAt: updated.currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
