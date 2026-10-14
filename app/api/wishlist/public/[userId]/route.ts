import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { serializePerfumeListItem } from "@/lib/serializers";
import { perfumeListArgs } from "@/types";
import type { ApiPerfumeListItem } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: { userId: string } };

export interface PublicWishlist {
  user: { firstName: string | null };
  items: { id: string; addedAt: string; perfume: ApiPerfumeListItem }[];
}

// GET /api/wishlist/public/[userId] — a user's wishlist, publicly readable.
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const user = await db.user.findFirst({
      where: { id: params.userId, deletedAt: null },
      select: { firstName: true },
    });
    if (!user) return apiError("Utilizatorul nu a fost găsit", 404);

    const items = await db.wishlistItem.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      include: { perfume: perfumeListArgs },
    });
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

    const data: PublicWishlist = {
      user: { firstName: user.firstName },
      items: activeItems.map((item) => ({
        id: item.id,
        addedAt: item.createdAt.toISOString(),
        perfume: serializePerfumeListItem(
          item.perfume,
          ratingByPerfume.get(item.perfumeId) ?? { average: 0, count: 0 },
        ),
      })),
    };

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
