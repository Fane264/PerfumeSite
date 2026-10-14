import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { createCouponSchema } from "@/lib/validations/coupon";

export const runtime = "nodejs";

// GET /api/admin/coupons — all coupons, newest first. Admin only.
export async function GET() {
  try {
    await requireAdmin();
    const coupons = await db.couponCode.findMany({
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(
      coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value.toNumber(),
        minOrderAmount: c.minOrderAmount ? c.minOrderAmount.toNumber() : null,
        maxUsageCount: c.maxUsageCount,
        usageCount: c.usageCount,
        isActive: c.isActive,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/coupons — create a coupon. Admin only.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createCouponSchema.parse(await req.json());

    const created = await db.couponCode.create({
      data: {
        code: input.code,
        type: input.type,
        value: input.value,
        minOrderAmount: input.minOrderAmount ?? null,
        maxUsageCount: input.maxUsageCount ?? null,
        isActive: input.isActive,
        expiresAt: input.expiresAt ?? null,
      },
    });

    return apiSuccess({ id: created.id, code: created.code }, undefined, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("Există deja un cupon cu acest cod", 409);
    }
    return handleApiError(error);
  }
}
