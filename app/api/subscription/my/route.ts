import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { serializeSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";

// GET /api/subscription/my — the member's subscription with plan + boxes, or
// null. Auth required.
export async function GET() {
  try {
    const user = await requireAuth();
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true, boxes: true },
    });
    return apiSuccess(subscription ? serializeSubscription(subscription) : null);
  } catch (error) {
    return handleApiError(error);
  }
}
