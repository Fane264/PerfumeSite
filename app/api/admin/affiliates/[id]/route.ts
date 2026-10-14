import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { affiliateAdminUpdateSchema } from "@/lib/validations/affiliate";
import { serializeAdminAffiliate } from "@/lib/affiliate";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/affiliates/[id] — approve/suspend or change commission rate.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.affiliateAccount.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Afiliatul nu a fost găsit", 404);

    const input = affiliateAdminUpdateSchema.parse(await req.json());

    const data: Prisma.AffiliateAccountUpdateInput = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.commissionRate !== undefined)
      data.commissionRate = input.commissionRate;

    const updated = await db.affiliateAccount.update({
      where: { id: params.id },
      data,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { conversions: true } },
      },
    });

    return apiSuccess(serializeAdminAffiliate(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
