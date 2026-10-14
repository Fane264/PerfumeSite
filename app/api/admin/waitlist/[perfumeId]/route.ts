import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { launchFlagsSchema } from "@/lib/validations/waitlist";

export const runtime = "nodejs";

type RouteContext = { params: { perfumeId: string } };

// PATCH /api/admin/waitlist/[perfumeId] — toggle a perfume's launch lifecycle
// flags (coming soon / waitlist / pre-order) and its launch date. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const input = launchFlagsSchema.parse(await req.json());

    const existing = await db.perfume.findUnique({
      where: { id: params.perfumeId },
      select: { id: true },
    });
    if (!existing) return apiError("Parfumul nu a fost găsit", 404);

    const data: Prisma.PerfumeUpdateInput = {};
    if (input.isComingSoon !== undefined) data.isComingSoon = input.isComingSoon;
    if (input.waitlistOpen !== undefined) data.waitlistOpen = input.waitlistOpen;
    if (input.preOrderOpen !== undefined) data.preOrderOpen = input.preOrderOpen;
    if (input.launchDate !== undefined) {
      data.launchDate = input.launchDate ? new Date(input.launchDate) : null;
    }

    const updated = await db.perfume.update({
      where: { id: params.perfumeId },
      data,
      select: {
        id: true,
        isComingSoon: true,
        waitlistOpen: true,
        preOrderOpen: true,
        launchDate: true,
      },
    });

    return apiSuccess({
      ...updated,
      launchDate: updated.launchDate?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
