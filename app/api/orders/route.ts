import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  apiSuccess,
  buildPaginationMeta,
  handleApiError,
} from "@/lib/api-response";
import {
  paginationSchema,
  searchParamsToObject,
} from "@/lib/validations/common";
import { serializeOrder } from "@/lib/serializers";
import { orderArgs } from "@/types";

export const runtime = "nodejs";

// GET /api/orders — current user's orders, newest first.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { page, limit } = paginationSchema.parse(
      searchParamsToObject(req.nextUrl.searchParams),
    );

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: { userId: user.id },
        ...orderArgs,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where: { userId: user.id } }),
    ]);

    return apiSuccess(
      orders.map((order) => serializeOrder(order)),
      { pagination: buildPaginationMeta(total, page, limit) },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
