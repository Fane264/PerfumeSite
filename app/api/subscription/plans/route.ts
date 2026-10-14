import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { serializeSubscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const revalidate = 300;

// GET /api/subscription/plans — public list of active discovery-box plans.
export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
    return apiSuccess(plans.map(serializeSubscriptionPlan));
  } catch (error) {
    return handleApiError(error);
  }
}
