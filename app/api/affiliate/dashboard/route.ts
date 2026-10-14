import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { serializeAffiliateDashboard } from "@/lib/affiliate";

export const runtime = "nodejs";

// GET /api/affiliate/dashboard — the current user's affiliate account + stats,
// or null when they have not applied yet.
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();

    const account = await db.affiliateAccount.findUnique({
      where: { userId: user.id },
      include: { conversions: true, payouts: true },
    });

    return apiSuccess(account ? serializeAffiliateDashboard(account) : null);
  } catch (error) {
    return handleApiError(error);
  }
}
