import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  apiSuccess,
  buildPaginationMeta,
  handleApiError,
} from "@/lib/api-response";
import { paginationSchema, searchParamsToObject } from "@/lib/validations/common";
import { createPerfumeSchema } from "@/lib/validations/product";
import { serializePerfumeDetail, serializePerfumeListItem } from "@/lib/serializers";
import { createPerfume } from "@/lib/products";
import { availableStock } from "@/lib/utils";
import { perfumeListArgs, type RatingSummary } from "@/types";

export const runtime = "nodejs";

const adminProductsQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    status: z.enum(["all", "active", "inactive"]).default("all"),
  })
  .merge(paginationSchema);

const EMPTY_RATING: RatingSummary = {
  average: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

// GET /api/admin/products — product catalog incl. inactive, with stock summary.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { q, status, page, limit } = adminProductsQuerySchema.parse(
      searchParamsToObject(req.nextUrl.searchParams),
    );

    const where: Prisma.PerfumeWhereInput = {};
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { house: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [perfumes, total] = await Promise.all([
      db.perfume.findMany({
        where,
        ...perfumeListArgs,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.perfume.count({ where }),
    ]);

    const data = perfumes.map((perfume) => {
      const totalStock = perfume.variants.reduce(
        (sum, v) => sum + (v.inventory?.quantity ?? 0),
        0,
      );
      const totalReserved = perfume.variants.reduce(
        (sum, v) => sum + (v.inventory?.reservedQuantity ?? 0),
        0,
      );
      const isLowStock = perfume.variants.some(
        (v) =>
          availableStock(
            v.inventory?.quantity ?? 0,
            v.inventory?.reservedQuantity ?? 0,
          ) <= (v.inventory?.lowStockThreshold ?? 0),
      );
      return {
        ...serializePerfumeListItem(perfume),
        isActive: perfume.isActive,
        totalStock,
        totalReserved,
        availableStock: Math.max(0, totalStock - totalReserved),
        isLowStock,
        variantCount: perfume.variants.length,
      };
    });

    return apiSuccess(data, {
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/products — create a perfume with variants, inventory, images
// and notes atomically. Admin only.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createPerfumeSchema.parse(await req.json());
    const perfume = await createPerfume(input);
    return apiSuccess(
      serializePerfumeDetail(perfume, EMPTY_RATING),
      undefined,
      201,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("Există deja un produs cu acest slug sau SKU", 409);
    }
    return handleApiError(error);
  }
}
