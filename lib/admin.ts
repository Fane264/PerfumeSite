import { OrderStatus, UserRole } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_CURRENCY } from "./constants";
import { availableStock, toNumber } from "./utils";
import type { AdminDashboardStats, LowStockItem } from "@/types";

// Order statuses that represent realized (collectable) revenue.
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/** Compute the figures shown on the admin dashboard in a handful of queries. */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [revenue, statusGroups, inventories, pendingReviews, totalCustomers] =
    await Promise.all([
      db.order.aggregate({
        _sum: { total: true },
        where: { status: { in: REVENUE_STATUSES } },
      }),
      db.order.groupBy({ by: ["status"], _count: true }),
      db.inventory.findMany({
        where: { variant: { isActive: true } },
        include: {
          variant: { include: { perfume: { select: { name: true } } } },
        },
      }),
      db.review.count({ where: { isApproved: false } }),
      db.user.count({ where: { role: UserRole.CUSTOMER, deletedAt: null } }),
    ]);

  const orderCountsByStatus = Object.values(OrderStatus).reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );
  let totalOrders = 0;
  for (const group of statusGroups) {
    orderCountsByStatus[group.status] = group._count;
    totalOrders += group._count;
  }

  const lowStockItems: LowStockItem[] = inventories
    .filter(
      (inv) =>
        availableStock(inv.quantity, inv.reservedQuantity) <=
        inv.lowStockThreshold,
    )
    .map((inv) => ({
      variantId: inv.variantId,
      sku: inv.variant.sku,
      perfumeName: inv.variant.perfume.name,
      sizeML: toNumber(inv.variant.sizeML),
      quantity: inv.quantity,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: availableStock(inv.quantity, inv.reservedQuantity),
      lowStockThreshold: inv.lowStockThreshold,
    }))
    .sort((a, b) => a.availableQuantity - b.availableQuantity)
    .slice(0, 100);

  return {
    revenue: {
      total: toNumber(revenue._sum.total),
      currency: DEFAULT_CURRENCY,
    },
    totalOrders,
    orderCountsByStatus,
    lowStockItems,
    pendingReviews,
    totalCustomers,
  };
}
