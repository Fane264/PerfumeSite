import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { stockNotificationSchema } from "@/lib/validations/common";

export const runtime = "nodejs";

// POST /api/stock-notifications — subscribe an email to a restock alert for a
// specific variant. Public (no auth required). { email, variantId }
export async function POST(req: NextRequest) {
  try {
    const { email, variantId } = stockNotificationSchema.parse(
      await req.json(),
    );

    const variant = await db.decantVariant.findUnique({
      where: { id: variantId },
      select: { id: true, isActive: true },
    });
    if (!variant || !variant.isActive) {
      return apiError("Varianta nu a fost găsită", 404);
    }

    // Idempotent: one queued alert per (email, variant). Re-subscribing resets
    // the notified flag so the customer is alerted on the next restock.
    await db.stockNotification.upsert({
      where: { email_variantId: { email, variantId } },
      create: { email, variantId },
      update: { isNotified: false },
    });

    return apiSuccess(
      { subscribed: true, message: "Te vom anunța când produsul revine în stoc." },
      undefined,
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
