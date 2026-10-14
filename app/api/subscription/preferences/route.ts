import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { updatePreferencesSchema } from "@/lib/validations/subscription";

export const runtime = "nodejs";

// PATCH /api/subscription/preferences — update olfactory preferences. Auth.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const preferences = updatePreferencesSchema.parse(await req.json());

    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!subscription) throw new NotFoundError("Nu ai un abonament activ");

    await db.subscription.update({
      where: { id: subscription.id },
      data: { preferences },
    });

    return apiSuccess({ preferences });
  } catch (error) {
    return handleApiError(error);
  }
}
