import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";
import { serializeOrder } from "@/lib/serializers";
import { orderArgs } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// GET /api/orders/[id] — full order detail. Owner or admin only.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth();

    const order = await db.order.findUnique({
      where: { id: params.id },
      ...orderArgs,
    });
    if (!order) return apiError("Comanda nu a fost găsită", 404);

    const isAdmin = user.role === UserRole.ADMIN;
    if (order.userId !== user.id && !isAdmin) {
      throw new ForbiddenError("Nu ai acces la această comandă");
    }

    return apiSuccess(serializeOrder(order, { includeCustomer: isAdmin }));
  } catch (error) {
    return handleApiError(error);
  }
}
