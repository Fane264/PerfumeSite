import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { getActiveFlashSale } from "@/lib/flash-sales";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";
// Cache the public payload for a minute — the countdown ticks client-side.
export const revalidate = 60;

// GET /api/flash-sales/active — the live flash sale with its products, or null.
export async function GET() {
  try {
    const sale = await getActiveFlashSale();
    if (!sale) return apiSuccess(null);

    const variantIds = sale.products.map((p) => p.variantId);
    const variants =
      variantIds.length > 0
        ? await db.decantVariant.findMany({
            where: { id: { in: variantIds } },
            include: {
              perfume: {
                select: {
                  name: true,
                  slug: true,
                  house: { select: { name: true } },
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          })
        : [];
    const byId = new Map(variants.map((v) => [v.id, v]));

    return apiSuccess({
      id: sale.id,
      title: sale.title,
      description: sale.description,
      bannerColor: sale.bannerColor,
      startsAt: sale.startsAt.toISOString(),
      endsAt: sale.endsAt.toISOString(),
      products: sale.products.map((p) => {
        const variant = byId.get(p.variantId);
        const salePrice = toNumber(p.salePrice);
        const originalPrice = toNumber(p.originalPrice);
        return {
          id: p.id,
          variantId: p.variantId,
          salePrice,
          originalPrice,
          discountPercent:
            originalPrice > 0
              ? Math.round((1 - salePrice / originalPrice) * 100)
              : 0,
          stockLimit: p.stockLimit,
          unitsSold: p.unitsSold,
          sizeML: variant ? toNumber(variant.sizeML) : null,
          perfumeName: variant?.perfume.name ?? null,
          perfumeSlug: variant?.perfume.slug ?? null,
          houseName: variant?.perfume.house.name ?? null,
          imageUrl: variant?.perfume.images[0]?.url ?? null,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
