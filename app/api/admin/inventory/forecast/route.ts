import { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

const WINDOW_DAYS = 30;
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export type ForecastStatus =
  | "critical"
  | "reorder_soon"
  | "ok"
  | "overstocked";

function statusFor(days: number | null): ForecastStatus {
  if (days === null) return "overstocked"; // no demand
  if (days < 7) return "critical";
  if (days < 30) return "reorder_soon";
  if (days <= 90) return "ok";
  return "overstocked";
}

// GET /api/admin/inventory/forecast — per-variant stockout projection and
// reorder recommendation based on the last 30 days of sales. Admin only.
export async function GET() {
  try {
    await requireAdmin();

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [variants, salesRows] = await Promise.all([
      db.decantVariant.findMany({
        where: { isActive: true },
        include: {
          inventory: true,
          perfume: {
            select: { name: true, house: { select: { name: true } } },
          },
        },
      }),
      db.orderItem.groupBy({
        by: ["variantId"],
        where: {
          order: { status: { in: REVENUE_STATUSES }, createdAt: { gte: since } },
        },
        _sum: { quantity: true },
      }),
    ]);

    const soldByVariant = new Map(
      salesRows.map((r) => [r.variantId, r._sum.quantity ?? 0]),
    );

    const items = variants.map((variant) => {
      const currentStock = variant.inventory?.quantity ?? 0;
      const sold = soldByVariant.get(variant.id) ?? 0;
      const avgUnitsPerDay = Math.round((sold / WINDOW_DAYS) * 100) / 100;

      const daysUntilStockout =
        avgUnitsPerDay > 0
          ? Math.round((currentStock / avgUnitsPerDay) * 10) / 10
          : null;

      // Cover 30 days of demand + 20% safety stock, net of current stock.
      const target = Math.ceil(avgUnitsPerDay * WINDOW_DAYS * 1.2);
      const recommendedReorder = Math.max(0, target - currentStock);

      return {
        variantId: variant.id,
        sku: variant.sku,
        perfumeName: variant.perfume.name,
        houseName: variant.perfume.house.name,
        sizeML: toNumber(variant.sizeML),
        currentStock,
        avgUnitsPerDay,
        daysUntilStockout,
        recommendedReorder,
        status: statusFor(daysUntilStockout),
      };
    });

    // Ascending by days-until-stockout (nulls last).
    items.sort((a, b) => {
      const av = a.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      const bv = b.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });

    const summary = {
      critical: items.filter((i) => i.status === "critical").length,
      reorder_soon: items.filter((i) => i.status === "reorder_soon").length,
      ok: items.filter((i) => i.status === "ok").length,
      overstocked: items.filter((i) => i.status === "overstocked").length,
    };

    return apiSuccess({ items, summary });
  } catch (error) {
    return handleApiError(error);
  }
}
