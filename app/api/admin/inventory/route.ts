import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { inventoryUpdateSchema } from "@/lib/validations/product";
import { getAdminDashboardStats } from "@/lib/admin";
import { sendRestockNotification } from "@/lib/resend";
import { sendPushToUser } from "@/lib/webpush";
import { availableStock, toNumber } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

// GET /api/admin/inventory — low-stock report (via dashboard stats).
export async function GET() {
  try {
    await requireAdmin();
    const stats = await getAdminDashboardStats();
    return apiSuccess({ lowStockItems: stats.lowStockItems });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/inventory — adjust stock. { variantId, quantity, operation }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { variantId, quantity, operation, lowStockThreshold } =
      inventoryUpdateSchema.parse(await req.json());

    const variant = await db.decantVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) return apiError("Varianta nu a fost găsită", 404);

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.inventory.upsert({
        where: { variantId },
        create: {
          variantId,
          quantity: 0,
          lowStockThreshold: lowStockThreshold ?? 5,
        },
        update: {},
      });

      let nextQuantity = inv.quantity;
      if (operation === "SET") nextQuantity = quantity;
      else if (operation === "ADD") nextQuantity = inv.quantity + quantity;
      else nextQuantity = inv.quantity - quantity;
      if (nextQuantity < 0) nextQuantity = 0;

      return tx.inventory.update({
        where: { variantId },
        data: {
          quantity: nextQuantity,
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
        },
      });
    });

    // Fire any pending restock alerts now that stock may be available again.
    const nowAvailable = availableStock(updated.quantity, updated.reservedQuantity);
    if (nowAvailable > 0) {
      try {
        await notifyRestock(variantId);
      } catch (err) {
        console.error("[Inventory] restock notifications failed:", err);
      }
    }

    return apiSuccess({
      variantId,
      quantity: updated.quantity,
      reservedQuantity: updated.reservedQuantity,
      availableQuantity: nowAvailable,
      lowStockThreshold: updated.lowStockThreshold,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Email everyone queued for a restock alert on this variant, then mark sent. */
async function notifyRestock(variantId: string): Promise<void> {
  const pending = await db.stockNotification.findMany({
    where: { variantId, isNotified: false },
  });
  if (pending.length === 0) return;

  const variant = await db.decantVariant.findUnique({
    where: { id: variantId },
    include: { perfume: { select: { name: true, slug: true } } },
  });
  if (!variant) return;

  const productUrl = `${APP_URL}/parfumuri/${variant.perfume.slug}`;
  const sizeML = toNumber(variant.sizeML);

  await Promise.all(
    pending.map((alert) =>
      sendRestockNotification(alert.email, {
        perfumeName: variant.perfume.name,
        sizeML,
        productUrl,
      }),
    ),
  );

  // Push the same alert to any subscriber whose email matches a queued request.
  try {
    const emails = [...new Set(pending.map((p) => p.email))];
    const users = await db.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) =>
        sendPushToUser(u.id, {
          title: "A revenit în stoc",
          body: `${variant.perfume.name} (${sizeML} ml) este din nou disponibil`,
          url: `/parfumuri/${variant.perfume.slug}`,
        }),
      ),
    );
  } catch (err) {
    console.error("[Inventory] restock push failed:", err);
  }

  await db.stockNotification.updateMany({
    where: { variantId, isNotified: false },
    data: { isNotified: true },
  });
}
