import { NextRequest } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

const bulkOrderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selectează cel puțin o comandă"),
  action: z.enum(["mark_processed", "mark_shipped"]),
});

// Statuses where stock has already been deducted.
const REALIZED_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PAID_COD,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

// PATCH /api/admin/orders/bulk — apply a status transition to many orders.
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const { ids, action } = bulkOrderSchema.parse(await req.json());

    const targetStatus =
      action === "mark_processed"
        ? OrderStatus.PROCESSING
        : OrderStatus.SHIPPED;

    const orders = await db.order.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        stockDeducted: true,
        shippedAt: true,
        items: { select: { variantId: true, quantity: true } },
      },
    });

    let updated = 0;
    await db.$transaction(async (tx) => {
      for (const order of orders) {
        // Deduct stock the first time an order reaches a realized status.
        const deduct =
          !order.stockDeducted && REALIZED_STATUSES.includes(targetStatus);
        if (deduct) {
          for (const item of order.items) {
            await tx.inventory.updateMany({
              where: { variantId: item.variantId },
              data: { quantity: { decrement: item.quantity } },
            });
          }
          await tx.inventory.updateMany({
            where: { quantity: { lt: 0 } },
            data: { quantity: 0 },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: targetStatus,
            ...(deduct ? { stockDeducted: true } : {}),
            ...(targetStatus === OrderStatus.SHIPPED && !order.shippedAt
              ? { shippedAt: new Date() }
              : {}),
          },
        });
        updated += 1;
      }
    });

    return apiSuccess({ updated });
  } catch (error) {
    return handleApiError(error);
  }
}
