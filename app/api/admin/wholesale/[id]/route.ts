import { NextRequest } from "next/server";
import { Prisma, WholesaleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { wholesaleAdminUpdateSchema } from "@/lib/validations/wholesale";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/wholesale/[id] — approve/suspend an account and/or adjust its
// discount rate, credit limit and notes. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const input = wholesaleAdminUpdateSchema.parse(await req.json());

    const existing = await db.wholesaleAccount.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, approvedAt: true },
    });
    if (!existing) return apiError("Contul wholesale nu a fost găsit", 404);

    const data: Prisma.WholesaleAccountUpdateInput = {};
    if (input.discountRate !== undefined) data.discountRate = input.discountRate;
    if (input.creditLimit !== undefined) data.creditLimit = input.creditLimit;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) {
      data.status = input.status as WholesaleStatus;
      // Stamp approval time the first time an account goes ACTIVE.
      if (
        input.status === "ACTIVE" &&
        existing.status !== WholesaleStatus.ACTIVE &&
        !existing.approvedAt
      ) {
        data.approvedAt = new Date();
      }
    }

    const updated = await db.wholesaleAccount.update({
      where: { id: params.id },
      data,
    });

    return apiSuccess({
      id: updated.id,
      status: updated.status,
      discountRate: updated.discountRate.toNumber(),
      creditLimit: updated.creditLimit?.toNumber() ?? null,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
