import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { createHouseSchema } from "@/lib/validations/product";
import { serializeHouseDetail } from "@/lib/serializers";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/houses — all active houses with their active-perfume counts.
export async function GET(_req: NextRequest) {
  try {
    const houses = await db.perfumeHouse.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { perfumes: { where: { isActive: true } } } },
      },
      orderBy: { name: "asc" },
    });

    const data = houses.map((house) => ({
      ...serializeHouseDetail(house),
      perfumeCount: house._count.perfumes,
    }));

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/houses — create a perfume house. Admin only.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const input = createHouseSchema.parse(await req.json());
    const slug = input.slug ?? slugify(input.name);

    const data: Prisma.PerfumeHouseCreateInput = {
      name: input.name,
      slug,
      description: input.description ?? null,
      story: input.story ?? null,
      logoUrl: input.logoUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      country: input.country,
      foundedYear: input.foundedYear ?? null,
      website: input.website ?? null,
      isActive: input.isActive,
    };

    const house = await db.perfumeHouse.create({ data });
    return apiSuccess(serializeHouseDetail(house), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
