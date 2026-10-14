import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { wishlistSchema } from "@/lib/validations/common";
import { serializePerfumeListItem } from "@/lib/serializers";
import { perfumeListArgs } from "@/types";

export const runtime = "nodejs";

// GET /api/wishlist — current user's wishlist with full perfume data.
export async function GET() {
  try {
    const user = await requireAuth();

    const items = await db.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { perfume: perfumeListArgs },
    });

    // Only surface still-active perfumes.
    const activeItems = items.filter((item) => item.perfume.isActive);

    const perfumeIds = activeItems.map((item) => item.perfumeId);
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

    const data = activeItems.map((item) => ({
      id: item.id,
      addedAt: item.createdAt.toISOString(),
      perfume: serializePerfumeListItem(
        item.perfume,
        ratingByPerfume.get(item.perfumeId) ?? { average: 0, count: 0 },
      ),
    }));

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/wishlist — add a perfume (idempotent). { perfumeId }
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { perfumeId } = wishlistSchema.parse(await req.json());

    const perfume = await db.perfume.findUnique({
      where: { id: perfumeId },
      select: { id: true },
    });
    if (!perfume) return apiError("Parfumul nu a fost găsit", 404);

    await db.wishlistItem.upsert({
      where: { userId_perfumeId: { userId: user.id, perfumeId } },
      create: { userId: user.id, perfumeId },
      update: {},
    });

    return apiSuccess({ perfumeId, wishlisted: true }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/wishlist — remove a perfume. { perfumeId }
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const { perfumeId } = wishlistSchema.parse(body);

    await db.wishlistItem.deleteMany({
      where: { userId: user.id, perfumeId },
    });

    return apiSuccess({ perfumeId, wishlisted: false });
  } catch (error) {
    return handleApiError(error);
  }
}
