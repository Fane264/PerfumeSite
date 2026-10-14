import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/wholesale/my — the current user's wholesale account status + recent
// wholesale orders (when active).
export async function GET() {
  try {
    const user = await requireAuth();

    const account = await db.wholesaleAccount.findUnique({
      where: { userId: user.id },
    });

    if (!account) {
      return apiSuccess({ hasAccount: false });
    }

    const orders =
      account.status === "ACTIVE"
        ? await db.order.findMany({
            where: { wholesaleAccountId: account.id },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              currency: true,
              createdAt: true,
            },
          })
        : [];

    return apiSuccess({
      hasAccount: true,
      status: account.status,
      companyName: account.companyName,
      cui: account.cui,
      discountRate: account.discountRate.toNumber(),
      creditLimit: account.creditLimit?.toNumber() ?? null,
      approvedAt: account.approvedAt?.toISOString() ?? null,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total.toNumber(),
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
