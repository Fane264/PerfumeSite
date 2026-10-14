import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
// Cache the (lightly randomized) social-proof payload for 5 minutes.
export const revalidate = 300;

type RouteContext = { params: { slug: string } };

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface PerfumeStats {
  orderedThisMonth: number;
  viewersNow: number;
  lastOrderedAt: string | null;
}

// GET /api/perfumes/[slug]/stats — public social-proof metrics for a product.
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const perfume = await db.perfume.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!perfume) return apiError("Parfumul nu a fost găsit", 404);

    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const variantFilter = { variant: { perfumeId: perfume.id } };

    const [orderedThisMonth, lastItem] = await Promise.all([
      db.orderItem.count({
        where: {
          ...variantFilter,
          order: { status: { in: PAID_STATUSES }, createdAt: { gte: since } },
        },
      }),
      db.orderItem.findFirst({
        where: { ...variantFilter, order: { status: { in: PAID_STATUSES } } },
        orderBy: { order: { createdAt: "desc" } },
        select: { order: { select: { createdAt: true } } },
      }),
    ]);

    const stats: PerfumeStats = {
      orderedThisMonth,
      // Realistic live-viewer simulation (no realtime infra required).
      viewersNow: Math.floor(Math.random() * 7) + 2,
      lastOrderedAt: lastItem?.order.createdAt.toISOString() ?? null,
    };

    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
