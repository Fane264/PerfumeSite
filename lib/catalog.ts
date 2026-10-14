import { Prisma } from "@prisma/client";
import { db } from "./db";
import { serializePerfumeListItem } from "./serializers";
import { getActiveFlashSaleVariantMap } from "./flash-sales";
import { perfumeListArgs, type PerfumeListPayload } from "@/types";
import type { ApiPerfumeListItem } from "@/types";
import type { PerfumeQueryInput } from "./validations/product";

/** Attach approved-review rating aggregates + live flash-sale pricing. */
export async function withRatings(
  perfumes: PerfumeListPayload[],
): Promise<ApiPerfumeListItem[]> {
  const ids = perfumes.map((p) => p.id);
  const [rows, flashSaleByVariant] = await Promise.all([
    ids.length > 0
      ? db.review.groupBy({
          by: ["perfumeId"],
          where: { perfumeId: { in: ids }, isApproved: true },
          _avg: { rating: true },
          _count: true,
        })
      : Promise.resolve([]),
    getActiveFlashSaleVariantMap(),
  ]);
  const byId = new Map(
    rows.map((r) => [r.perfumeId, { average: r._avg.rating ?? 0, count: r._count }]),
  );
  return perfumes.map((p) =>
    serializePerfumeListItem(
      p,
      byId.get(p.id) ?? { average: 0, count: 0 },
      flashSaleByVariant,
    ),
  );
}

/**
 * Build the Prisma `where` for a catalog query from validated filters. Shared
 * by the public API and server-rendered listing page.
 */
export function buildPerfumeWhere(
  query: PerfumeQueryInput,
): Prisma.PerfumeWhereInput {
  const where: Prisma.PerfumeWhereInput = { isActive: true };

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { perfumer: { contains: query.q, mode: "insensitive" } },
      { house: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  if (query.house) where.house = { slug: query.house };
  if (query.family) where.family = { slug: query.family };
  if (query.gender) where.gender = query.gender;
  if (query.featured !== undefined) where.isFeatured = query.featured;
  if (query.notes) {
    const slugs = query.notes.split(",").map((s) => s.trim()).filter(Boolean);
    if (slugs.length > 0) {
      where.notes = { some: { note: { slug: { in: slugs } } } };
    }
  }

  const variantWhere: Prisma.DecantVariantWhereInput = { isActive: true };
  let hasVariantFilter = false;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    variantWhere.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
    hasVariantFilter = true;
  }
  if (query.sizeML !== undefined) {
    variantWhere.sizeML = query.sizeML;
    hasVariantFilter = true;
  }
  if (query.available) {
    variantWhere.inventory = { quantity: { gt: 0 } };
    hasVariantFilter = true;
  }
  if (hasVariantFilter) where.variants = { some: variantWhere };

  return where;
}

export interface PerfumeQueryResult {
  items: ApiPerfumeListItem[];
  total: number;
}

/** Execute a full catalog query (filters, sorting, pagination, ratings). */
export async function queryPerfumes(
  query: PerfumeQueryInput,
): Promise<PerfumeQueryResult> {
  const { page, limit, sort } = query;
  const skip = (page - 1) * limit;
  const where = buildPerfumeWhere(query);

  // Price sorts require ordering by the min variant price across all matches.
  if (sort === "price_asc" || sort === "price_desc") {
    const rows = await db.perfume.findMany({
      where,
      select: {
        id: true,
        variants: { where: { isActive: true }, select: { price: true } },
      },
    });
    const ranked = rows
      .map((r) => ({
        id: r.id,
        min: r.variants.length
          ? Math.min(...r.variants.map((v) => v.price.toNumber()))
          : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => (sort === "price_asc" ? a.min - b.min : b.min - a.min));

    const pageIds = ranked.slice(skip, skip + limit).map((r) => r.id);
    const fetched = await db.perfume.findMany({
      where: { id: { in: pageIds } },
      ...perfumeListArgs,
    });
    const byId = new Map(fetched.map((p) => [p.id, p]));
    const ordered = pageIds
      .map((id) => byId.get(id))
      .filter((p): p is PerfumeListPayload => p !== undefined);
    return { items: await withRatings(ordered), total: ranked.length };
  }

  const orderBy: Prisma.PerfumeOrderByWithRelationInput[] =
    sort === "popular"
      ? [{ reviews: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const [perfumes, total] = await Promise.all([
    db.perfume.findMany({ where, ...perfumeListArgs, orderBy, skip, take: limit }),
    db.perfume.count({ where }),
  ]);

  return { items: await withRatings(perfumes), total };
}

/**
 * Fetch a set of perfumes by slug, preserving the requested order and dropping
 * any inactive or missing slugs. Used by editorial embeds (blog) and the AI
 * assistant to turn a list of recommended slugs into full card data.
 */
export async function getPerfumesBySlugs(
  slugs: string[],
): Promise<ApiPerfumeListItem[]> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const perfumes = await db.perfume.findMany({
    where: { isActive: true, slug: { in: unique } },
    ...perfumeListArgs,
  });
  const items = await withRatings(perfumes);
  const bySlug = new Map(items.map((p) => [p.slug, p]));
  return unique
    .map((slug) => bySlug.get(slug))
    .filter((p): p is ApiPerfumeListItem => p !== undefined);
}

/** Featured perfumes for the homepage. */
export async function getFeaturedPerfumes(
  limit = 8,
): Promise<ApiPerfumeListItem[]> {
  const perfumes = await db.perfume.findMany({
    where: { isActive: true, isFeatured: true },
    ...perfumeListArgs,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return withRatings(perfumes);
}
