import { NextRequest } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { availableStock, toNumber } from "@/lib/utils";
import type { AdminAnalytics, AnalyticsPeriod } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Order statuses that represent realized (collectable) revenue.
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "12m"];

interface PeriodConfig {
  /** Inclusive start of the current window. */
  start: Date;
  /** Inclusive start of the immediately preceding window. */
  prevStart: Date;
  /** "day" | "month" bucket granularity. */
  granularity: "day" | "month";
  /** Ordered, zero-filled bucket keys covering the current window. */
  buckets: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD (UTC). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM (UTC). */
function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function resolvePeriod(period: AnalyticsPeriod): PeriodConfig {
  const now = new Date();

  if (period === "12m") {
    // 12 monthly buckets ending with the current month.
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    );
    const prevStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1),
    );
    const buckets: string[] = [];
    for (let i = 0; i < 12; i++) {
      buckets.push(
        monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))),
      );
    }
    return { start, prevStart, granularity: "month", buckets };
  }

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(today.getTime() - (days - 1) * DAY_MS);
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const buckets: string[] = [];
  for (let i = 0; i < days; i++) {
    buckets.push(dayKey(new Date(start.getTime() + i * DAY_MS)));
  }
  return { start, prevStart, granularity: "day", buckets };
}

function emptyStatusRecord(): Record<OrderStatus, number> {
  return Object.values(OrderStatus).reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );
}

// GET /api/admin/analytics?period=7d|30d|90d|12m — dashboard metrics. Admin only.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const rawPeriod = req.nextUrl.searchParams.get("period");
    const period: AnalyticsPeriod = PERIODS.includes(rawPeriod as AnalyticsPeriod)
      ? (rawPeriod as AnalyticsPeriod)
      : "30d";
    const cfg = resolvePeriod(period);
    const bucketKey = cfg.granularity === "month" ? monthKey : dayKey;

    const [
      periodOrders,
      previousRevenueAgg,
      previousOrderCount,
      statusGroups,
      inventories,
      totalCustomers,
      newCustomers,
      repeatBuyers,
    ] = await Promise.all([
      // Current-window revenue orders, with items for product/house breakdowns.
      db.order.findMany({
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: cfg.start },
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              priceAtPurchase: true,
              perfumeNameAtPurchase: true,
              houseNameAtPurchase: true,
              variant: {
                select: {
                  perfume: {
                    select: {
                      id: true,
                      houseId: true,
                      images: {
                        where: { isPrimary: true },
                        select: { url: true },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.order.aggregate({
        _sum: { total: true },
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: cfg.prevStart, lt: cfg.start },
        },
      }),
      db.order.count({
        where: { createdAt: { gte: cfg.prevStart, lt: cfg.start } },
      }),
      // Status breakdown across all orders in the current window.
      db.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: cfg.start } },
        _count: true,
      }),
      db.inventory.findMany({
        where: { variant: { isActive: true } },
        select: {
          variantId: true,
          quantity: true,
          reservedQuantity: true,
          lowStockThreshold: true,
          variant: {
            select: {
              sizeML: true,
              perfume: {
                select: { name: true, house: { select: { name: true } } },
              },
            },
          },
        },
      }),
      db.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
      db.user.count({
        where: {
          role: "CUSTOMER",
          deletedAt: null,
          createdAt: { gte: cfg.start },
        },
      }),
      // Customers with more than one order overall (returning buyers).
      db.order.groupBy({
        by: ["userId"],
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } },
      }),
    ]);

    // ---- Revenue & order time series -------------------------------------
    const revenueByBucket = new Map<string, number>(
      cfg.buckets.map((b) => [b, 0]),
    );
    const ordersByBucket = new Map<string, number>(
      cfg.buckets.map((b) => [b, 0]),
    );
    let revenueTotal = 0;

    // ---- Product / house aggregation -------------------------------------
    const perfumeAgg = new Map<
      string,
      { name: string; houseName: string; units: number; revenue: number; imageUrl: string | null }
    >();
    const houseAgg = new Map<
      string,
      { name: string; revenue: number; orderIds: Set<string> }
    >();

    for (const order of periodOrders) {
      const key = bucketKey(order.createdAt);
      const total = toNumber(order.total);
      revenueTotal += total;
      if (revenueByBucket.has(key)) {
        revenueByBucket.set(key, (revenueByBucket.get(key) ?? 0) + total);
        ordersByBucket.set(key, (ordersByBucket.get(key) ?? 0) + 1);
      }

      for (const item of order.items) {
        const lineRevenue = toNumber(item.priceAtPurchase) * item.quantity;
        const perfumeId = item.variant.perfume.id;
        const houseId = item.variant.perfume.houseId;

        const p = perfumeAgg.get(perfumeId);
        if (p) {
          p.units += item.quantity;
          p.revenue += lineRevenue;
        } else {
          perfumeAgg.set(perfumeId, {
            name: item.perfumeNameAtPurchase,
            houseName: item.houseNameAtPurchase,
            units: item.quantity,
            revenue: lineRevenue,
            imageUrl: item.variant.perfume.images[0]?.url ?? null,
          });
        }

        const h = houseAgg.get(houseId);
        if (h) {
          h.revenue += lineRevenue;
          h.orderIds.add(order.id);
        } else {
          houseAgg.set(houseId, {
            name: item.houseNameAtPurchase,
            revenue: lineRevenue,
            orderIds: new Set([order.id]),
          });
        }
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const byStatus = emptyStatusRecord();
    let ordersTotal = 0;
    for (const group of statusGroups) {
      byStatus[group.status] = group._count;
      ordersTotal += group._count;
    }

    const topPerfumes = Array.from(perfumeAgg.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        houseName: v.houseName,
        unitsSold: v.units,
        revenue: round2(v.revenue),
        imageUrl: v.imageUrl,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    const topHouses = Array.from(houseAgg.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        revenue: round2(v.revenue),
        orderCount: v.orderIds.size,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStock = inventories
      .filter(
        (inv) =>
          inv.quantity > 0 &&
          availableStock(inv.quantity, inv.reservedQuantity) <=
            inv.lowStockThreshold,
      )
      .map((inv) => ({
        variantId: inv.variantId,
        perfumeName: inv.variant.perfume.name,
        houseName: inv.variant.perfume.house.name,
        sizeML: toNumber(inv.variant.sizeML),
        quantity: availableStock(inv.quantity, inv.reservedQuantity),
        threshold: inv.lowStockThreshold,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 20);

    const analytics: AdminAnalytics = {
      period,
      revenue: {
        total: round2(revenueTotal),
        previous: round2(toNumber(previousRevenueAgg._sum.total)),
        currency: DEFAULT_CURRENCY,
        byDay: cfg.buckets.map((date) => ({
          date,
          amount: round2(revenueByBucket.get(date) ?? 0),
        })),
      },
      orders: {
        total: ordersTotal,
        previous: previousOrderCount,
        byStatus,
        byDay: cfg.buckets.map((date) => ({
          date,
          count: ordersByBucket.get(date) ?? 0,
        })),
      },
      topPerfumes,
      topHouses,
      customers: {
        total: totalCustomers,
        new: newCustomers,
        returning: repeatBuyers.length,
      },
      lowStock,
    };

    return apiSuccess(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
