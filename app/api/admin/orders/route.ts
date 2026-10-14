import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  apiSuccess,
  buildPaginationMeta,
  handleApiError,
} from "@/lib/api-response";
import { adminOrdersQuerySchema } from "@/lib/validations/order";
import { searchParamsToObject } from "@/lib/validations/common";
import { serializeOrder } from "@/lib/serializers";
import { orderArgs } from "@/types";

export const runtime = "nodejs";

// GET /api/admin/orders — all orders with status/date/search filters. Admin.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { status, q, from, to, page, limit } = adminOrdersQuerySchema.parse(
      searchParamsToObject(req.nextUrl.searchParams),
    );

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }
    if (q) {
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        ...orderArgs,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return apiSuccess(
      orders.map((order) => serializeOrder(order, { includeCustomer: true })),
      { pagination: buildPaginationMeta(total, page, limit) },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
