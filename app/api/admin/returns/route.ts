import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { adminReturnQuerySchema } from "@/lib/validations/return";
import { searchParamsToObject } from "@/lib/validations/common";
import { returnInclude, serializeReturn } from "@/lib/returns";

export const runtime = "nodejs";

// GET /api/admin/returns — all return requests with optional status/search filters.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { status, q } = adminReturnQuerySchema.parse(
      searchParamsToObject(req.nextUrl.searchParams),
    );

    const where: Prisma.ReturnRequestWhereInput = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { order: { orderNumber: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const returns = await db.returnRequest.findMany({
      where,
      include: returnInclude,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(returns.map(serializeReturn));
  } catch (error) {
    return handleApiError(error);
  }
}
