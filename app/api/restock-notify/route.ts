import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { stockNotificationSchema } from "@/lib/validations/common";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/restock-notify — subscribe an email to a restock alert for a
// specific variant. Public (no auth). Body: { email, variantId }
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const { email, variantId } = stockNotificationSchema.parse(await req.json());

    const variant = await db.decantVariant.findUnique({
      where: { id: variantId },
      select: { id: true, isActive: true },
    });
    if (!variant || !variant.isActive) {
      return apiError("Varianta nu a fost găsită", 404);
    }

    const existing = await db.stockNotification.findUnique({
      where: { email_variantId: { email, variantId } },
      select: { id: true, isNotified: true },
    });

    // Idempotent: one queued alert per (email, variant). Re-subscribing after a
    // prior notification resets the flag so the next restock alerts again.
    await db.stockNotification.upsert({
      where: { email_variantId: { email, variantId } },
      create: { email, variantId },
      update: { isNotified: false },
    });

    const alreadyRegistered = Boolean(existing && !existing.isNotified);

    return apiSuccess(
      {
        subscribed: true,
        alreadyRegistered,
        message: alreadyRegistered
          ? "Ești deja înscris — te vom anunța când produsul revine."
          : "Te vom anunța pe email când produsul revine în stoc.",
      },
      undefined,
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
