import { SubscriptionStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { pauseSubscription } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/subscription/pause — pause collection (no charges, no boxes). Auth.
export async function POST() {
  try {
    const user = await requireAuth();
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!subscription) throw new NotFoundError("Nu ai un abonament activ");

    await pauseSubscription(subscription.stripeSubscriptionId);
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAUSED },
    });

    return apiSuccess({ status: SubscriptionStatus.PAUSED });
  } catch (error) {
    return handleApiError(error);
  }
}
