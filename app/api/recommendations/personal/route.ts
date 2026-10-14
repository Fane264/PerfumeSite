import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { withRatings } from "@/lib/catalog";
import { perfumeListArgs, type PerfumeListPayload } from "@/types";

export const runtime = "nodejs";
export const revalidate = 300;

const SECTION_SIZE = 8;

// GET /api/recommendations/personal — a personalized selection derived from the
// member's recent purchases (falling back to their wishlist). Auth required.
export async function GET() {
  try {
    const user = await requireAuth();

    // Last 5 orders → the perfumes (and their families/houses/notes) bought.
    const orders = await db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: {
          include: {
            variant: {
              select: {
                perfume: {
                  select: {
                    id: true,
                    familyId: true,
                    houseId: true,
                    notes: { select: { noteId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const purchasedIds = new Set<string>();
    const familyIds = new Set<string>();
    const houseIds = new Set<string>();
    const noteIds = new Set<string>();

    for (const order of orders) {
      for (const item of order.items) {
        const p = item.variant.perfume;
        purchasedIds.add(p.id);
        familyIds.add(p.familyId);
        houseIds.add(p.houseId);
        for (const n of p.notes) noteIds.add(n.noteId);
      }
    }

    // Fall back to the wishlist when there are no purchases yet.
    if (purchasedIds.size === 0) {
      const wishlist = await db.wishlistItem.findMany({
        where: { userId: user.id },
        include: {
          perfume: {
            select: {
              id: true,
              familyId: true,
              houseId: true,
              notes: { select: { noteId: true } },
            },
          },
        },
        take: 10,
      });
      for (const w of wishlist) {
        familyIds.add(w.perfume.familyId);
        houseIds.add(w.perfume.houseId);
        for (const n of w.perfume.notes) noteIds.add(n.noteId);
      }
    }

    const hasEnoughData = orders.some((o) => o.items.length > 0);
    const excludeIds = [...purchasedIds];
    const notPurchased: Prisma.PerfumeWhereInput = {
      isActive: true,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    };

    const familyArr = [...familyIds];
    const houseArr = [...houseIds];
    const noteArr = [...noteIds];

    const [basedOn, topInFamilies, housesYouLike, newArrivals] =
      await Promise.all([
        // Same family OR shared notes as past purchases.
        familyArr.length || noteArr.length
          ? db.perfume.findMany({
              where: {
                ...notPurchased,
                OR: [
                  ...(familyArr.length ? [{ familyId: { in: familyArr } }] : []),
                  ...(noteArr.length
                    ? [{ notes: { some: { noteId: { in: noteArr } } } }]
                    : []),
                ],
              },
              ...perfumeListArgs,
              orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
              take: SECTION_SIZE,
            })
          : Promise.resolve([]),
        // Bestsellers (by review count) in the families bought.
        familyArr.length
          ? db.perfume.findMany({
              where: { ...notPurchased, familyId: { in: familyArr } },
              ...perfumeListArgs,
              orderBy: [{ reviews: { _count: "desc" } }, { createdAt: "desc" }],
              take: SECTION_SIZE,
            })
          : Promise.resolve([]),
        // More from the houses ordered before.
        houseArr.length
          ? db.perfume.findMany({
              where: { ...notPurchased, houseId: { in: houseArr } },
              ...perfumeListArgs,
              orderBy: { createdAt: "desc" },
              take: SECTION_SIZE,
            })
          : Promise.resolve([]),
        // Newest perfumes the user hasn't bought.
        db.perfume.findMany({
          where: notPurchased,
          ...perfumeListArgs,
          orderBy: { createdAt: "desc" },
          take: SECTION_SIZE,
        }),
      ]);

    const [
      basedOnItems,
      topItems,
      houseItems,
      newItems,
    ] = await Promise.all([
      withRatings(basedOn as PerfumeListPayload[]),
      withRatings(topInFamilies as PerfumeListPayload[]),
      withRatings(housesYouLike as PerfumeListPayload[]),
      withRatings(newArrivals as PerfumeListPayload[]),
    ]);

    return apiSuccess({
      hasEnoughData,
      basedOnPurchases: basedOnItems,
      topInYourFamilies: topItems,
      housesYouLike: houseItems,
      newArrivals: newItems,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
