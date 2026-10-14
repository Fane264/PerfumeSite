import { NextRequest } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { sendAbandonedCartEmail } from "@/lib/resend";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/cron/abandoned-cart — emails customers with carts left idle > 2h.
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

    const twoHoursAgo = new Date(Date.now() - TWO_HOURS_MS);
    const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);

    const carts = await db.cart.findMany({
      where: {
        updatedAt: { lt: twoHoursAgo },
        abandonedEmailSentAt: null,
        items: { some: {} },
        user: {
          deletedAt: null,
          // Has at least one paid order historically (filters out bots/spam).
          orders: { some: { status: { in: PAID_STATUSES } } },
          // …but hasn't placed any order in the last 24h.
          NOT: { orders: { some: { createdAt: { gte: oneDayAgo } } } },
        },
      },
      include: {
        user: { select: { email: true, firstName: true } },
        items: {
          include: {
            variant: {
              include: {
                perfume: {
                  include: {
                    house: { select: { name: true } },
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
    });

    let sent = 0;
    for (const cart of carts) {
      if (cart.items.length === 0) continue;
      const items = cart.items.map((item) => ({
        perfumeName: item.variant.perfume.name,
        houseName: item.variant.perfume.house.name,
        sizeML: toNumber(item.variant.sizeML),
        quantity: item.quantity,
        unitPrice: toNumber(item.variant.price),
        imageUrl: item.variant.perfume.images[0]?.url ?? null,
      }));

      try {
        const result = await sendAbandonedCartEmail(cart.user, items);
        if (result.sent) sent += 1;
        // Mark regardless so a missing Resend key doesn't loop the same cart.
        await db.cart.update({
          where: { id: cart.id },
          data: { abandonedEmailSentAt: new Date() },
        });
      } catch (err) {
        console.error(
          `[cron/abandoned-cart] failed for cart ${cart.id}:`,
          err,
        );
      }
    }

    return apiSuccess({ processed: carts.length, sent });
  } catch (error) {
    return handleApiError(error);
  }
}
