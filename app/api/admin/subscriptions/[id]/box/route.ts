import { NextRequest } from "next/server";
import { BoxStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateBoxSchema } from "@/lib/validations/subscription";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/subscriptions/[id]/box — update a box's contents/status/
// tracking. `[id]` is the SubscriptionBox id. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const input = updateBoxSchema.parse(await req.json());

    const box = await db.subscriptionBox.findUnique({
      where: { id: params.id },
      select: { id: true, shippedAt: true },
    });
    if (!box) return apiError("Box-ul nu a fost găsit", 404);

    const data: Prisma.SubscriptionBoxUpdateInput = {};
    if (input.status !== undefined) {
      data.status = input.status;
      // Stamp the shipped time the first time it transitions to SHIPPED.
      if (input.status === BoxStatus.SHIPPED && !box.shippedAt) {
        data.shippedAt = new Date();
      }
    }
    if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber;
    if (input.contents !== undefined) {
      data.contents = input.contents as Prisma.InputJsonValue;
    }

    const updated = await db.subscriptionBox.update({
      where: { id: params.id },
      data,
    });

    return apiSuccess({
      id: updated.id,
      status: updated.status,
      trackingNumber: updated.trackingNumber,
      shippedAt: updated.shippedAt ? updated.shippedAt.toISOString() : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
