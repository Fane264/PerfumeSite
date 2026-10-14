import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { sendLowStockAlert } from "@/lib/resend";
import { availableStock, toNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/cron/low-stock-alert — daily digest of low-stock variants to admin.
// Protected by the `x-cron-secret` header.
export async function GET(req: NextRequest) {
  try {
    // Accept the spec's `x-cron-secret` header, or Vercel Cron's native
    // `Authorization: Bearer <CRON_SECRET>`.
    const provided =
      req.headers.get("x-cron-secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!env.CRON_SECRET || provided !== env.CRON_SECRET) {
      return apiError("Neautorizat", 401);
    }

    if (!env.ADMIN_EMAIL) {
      return apiSuccess({ alerted: 0, skipped: "ADMIN_EMAIL not configured" });
    }

    const dayAgo = new Date(Date.now() - ONE_DAY_MS);

    // Candidates: in stock, not alerted within the cooldown window. The
    // available-vs-threshold comparison (two columns) is applied in JS.
    const candidates = await db.inventory.findMany({
      where: {
        quantity: { gt: 0 },
        variant: { isActive: true },
        OR: [
          { lowStockAlertSentAt: null },
          { lowStockAlertSentAt: { lt: dayAgo } },
        ],
      },
      include: {
        variant: {
          select: {
            sizeML: true,
            perfume: {
              select: { name: true, house: { select: { name: true } } },
            },
          },
        },
      },
    });

    const lowStock = candidates.filter(
      (inv) =>
        availableStock(inv.quantity, inv.reservedQuantity) <=
        inv.lowStockThreshold,
    );

    if (lowStock.length === 0) {
      return apiSuccess({ alerted: 0 });
    }

    const items = lowStock.map((inv) => ({
      perfumeName: inv.variant.perfume.name,
      houseName: inv.variant.perfume.house.name,
      sizeML: toNumber(inv.variant.sizeML),
      quantity: availableStock(inv.quantity, inv.reservedQuantity),
      threshold: inv.lowStockThreshold,
    }));

    try {
      await sendLowStockAlert(env.ADMIN_EMAIL, items);
    } catch (err) {
      console.error("[cron/low-stock-alert] email failed:", err);
    }

    // Stamp every alerted record so they're skipped for the cooldown window.
    await db.inventory.updateMany({
      where: { id: { in: lowStock.map((inv) => inv.id) } },
      data: { lowStockAlertSentAt: new Date() },
    });

    return apiSuccess({ alerted: lowStock.length });
  } catch (error) {
    return handleApiError(error);
  }
}
