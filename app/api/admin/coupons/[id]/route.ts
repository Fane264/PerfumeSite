import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateCouponSchema } from "@/lib/validations/coupon";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/coupons/[id] — toggle/update a coupon. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const existing = await db.couponCode.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Cuponul nu a fost găsit", 404);

    const input = updateCouponSchema.parse(await req.json());

    const data: Prisma.CouponCodeUpdateInput = {};
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.value !== undefined) data.value = input.value;
    if (input.minOrderAmount !== undefined)
      data.minOrderAmount = input.minOrderAmount;
    if (input.maxUsageCount !== undefined)
      data.maxUsageCount = input.maxUsageCount;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;

    const updated = await db.couponCode.update({
      where: { id: params.id },
      data,
      select: { id: true, isActive: true },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/coupons/[id] — remove a coupon. Admin only.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const existing = await db.couponCode.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { orders: true } } },
    });
    if (!existing) return apiError("Cuponul nu a fost găsit", 404);

    // Coupons referenced by orders are deactivated instead of deleted to keep
    // historical orders intact.
    if (existing._count.orders > 0) {
      await db.couponCode.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return apiSuccess({ id: params.id, deactivated: true });
    }

    await db.couponCode.delete({ where: { id: params.id } });
    return apiSuccess({ id: params.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
