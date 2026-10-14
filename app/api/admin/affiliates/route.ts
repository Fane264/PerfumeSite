import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { serializeAdminAffiliate } from "@/lib/affiliate";

export const runtime = "nodejs";

// GET /api/admin/affiliates — every affiliate account with stats. Admin only.
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const accounts = await db.affiliateAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { conversions: true } },
      },
    });

    return apiSuccess(accounts.map(serializeAdminAffiliate));
  } catch (error) {
    return handleApiError(error);
  }
}
