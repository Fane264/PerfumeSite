import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateHouseSchema } from "@/lib/validations/product";
import { serializeHouseDetail, serializePerfumeListItem } from "@/lib/serializers";
import { houseWithPerfumesArgs } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: { slug: string } };

// GET /api/houses/[slug] — house detail with its active perfumes (+ ratings).
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const house = await db.perfumeHouse.findUnique({
      where: { slug: params.slug },
      ...houseWithPerfumesArgs,
    });

    if (!house || !house.isActive) {
      return apiError("Casa de parfumuri nu a fost găsită", 404);
    }

    const perfumeIds = house.perfumes.map((p) => p.id);
    const ratingRows =
      perfumeIds.length > 0
        ? await db.review.groupBy({
            by: ["perfumeId"],
            where: { perfumeId: { in: perfumeIds }, isApproved: true },
            _avg: { rating: true },
            _count: true,
          })
        : [];
    const ratingByPerfume = new Map(
      ratingRows.map((r) => [
        r.perfumeId,
        { average: r._avg.rating ?? 0, count: r._count },
      ]),
    );

    const data = {
      ...serializeHouseDetail(house),
      perfumes: house.perfumes.map((p) =>
        serializePerfumeListItem(
          p,
          ratingByPerfume.get(p.id) ?? { average: 0, count: 0 },
        ),
      ),
    };

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/houses/[slug] — update house fields. Admin only.
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.perfumeHouse.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return apiError("Casa de parfumuri nu a fost găsită", 404);

    const input = updateHouseSchema.parse(await req.json());

    const data: Prisma.PerfumeHouseUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.description !== undefined) data.description = input.description;
    if (input.story !== undefined) data.story = input.story;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.country !== undefined) data.country = input.country;
    if (input.foundedYear !== undefined) data.foundedYear = input.foundedYear;
    if (input.website !== undefined) data.website = input.website;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const house = await db.perfumeHouse.update({
      where: { id: existing.id },
      data,
    });

    return apiSuccess(serializeHouseDetail(house));
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/houses/[slug] — soft delete (isActive = false). Admin only.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.perfumeHouse.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return apiError("Casa de parfumuri nu a fost găsită", 404);

    await db.perfumeHouse.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    return apiSuccess({ id: existing.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
