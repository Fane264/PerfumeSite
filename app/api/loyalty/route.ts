import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, buildPaginationMeta, handleApiError } from "@/lib/api-response";
import { getOrCreateLoyaltyAccount, getPointsBalance } from "@/lib/loyalty";

export const runtime = "nodejs";

// GET /api/loyalty — the member's balance, tier, and a paginated transaction
// ledger. Auth required.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const account = await getOrCreateLoyaltyAccount(user.id);
    const balance = await getPointsBalance(user.id);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") ?? "20") || 20),
    );

    const [total, transactions] = await Promise.all([
      db.loyaltyTransaction.count({ where: { accountId: account.id } }),
      db.loyaltyTransaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return apiSuccess(
      {
        balance: balance.available,
        lifetime: balance.lifetime,
        tier: balance.tier,
        nextTier: balance.nextTier,
        nextTierPoints: balance.nextTierPoints,
        expiringThisMonth: balance.expiringThisMonth,
        transactions: transactions.map((t) => ({
          id: t.id,
          points: t.points,
          type: t.type,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
          expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
        })),
      },
      { pagination: buildPaginationMeta(total, page, limit) },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
