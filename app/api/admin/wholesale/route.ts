import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/admin/wholesale — all wholesale accounts + aggregate revenue stats.
export async function GET() {
  try {
    await requireAdmin();

    const accounts = await db.wholesaleAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { orders: true } },
      },
    });

    // Total revenue per wholesale account (RON-denominated orders only).
    const revenueGroups = await db.order.groupBy({
      by: ["wholesaleAccountId"],
      where: { isWholesale: true, wholesaleAccountId: { not: null } },
      _sum: { total: true },
    });
    const revenueByAccount = new Map(
      revenueGroups.map((g) => [
        g.wholesaleAccountId,
        g._sum.total?.toNumber() ?? 0,
      ]),
    );

    const data = accounts.map((a) => ({
      id: a.id,
      companyName: a.companyName,
      cui: a.cui,
      website: a.website,
      status: a.status,
      discountRate: a.discountRate.toNumber(),
      creditLimit: a.creditLimit?.toNumber() ?? null,
      notes: a.notes,
      approvedAt: a.approvedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      email: a.user.email,
      contactName:
        `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() || null,
      orderCount: a._count.orders,
      totalRevenue: revenueByAccount.get(a.id) ?? 0,
    }));

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
