import { SubscriptionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/admin/subscriptions — all subscribers + MRR/churn stats + this
// month's boxes. Admin only.
export async function GET() {
  try {
    await requireAdmin();

    const month = new Date().toISOString().slice(0, 7);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [subscriptions, churnThisMonth, boxes] = await Promise.all([
      db.subscription.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          plan: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      db.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
          updatedAt: { gte: monthStart },
        },
      }),
      db.subscriptionBox.findMany({
        where: { month },
        include: {
          subscription: {
            include: {
              plan: { select: { name: true } },
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const active = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE,
    );
    const mrr = active.reduce((sum, s) => sum + toNumber(s.plan.price), 0);

    const name = (u: { firstName: string | null; lastName: string | null; email: string }) =>
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;

    return apiSuccess({
      stats: {
        activeCount: active.length,
        mrr: Math.round(mrr * 100) / 100,
        churnThisMonth,
        totalSubscribers: subscriptions.length,
      },
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        user: name(s.user),
        email: s.user.email,
        plan: s.plan.name,
        status: s.status,
        startedAt: s.createdAt.toISOString(),
        nextBilling: s.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      })),
      boxesThisMonth: boxes.map((b) => ({
        id: b.id,
        month: b.month,
        status: b.status,
        trackingNumber: b.trackingNumber,
        contents: b.contents,
        user: name(b.subscription.user),
        plan: b.subscription.plan.name,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
