import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  apiSuccess,
  buildPaginationMeta,
  handleApiError,
} from "@/lib/api-response";
import { perfumeQuerySchema, createPerfumeSchema } from "@/lib/validations/product";
import { searchParamsToObject } from "@/lib/validations/common";
import { serializePerfumeDetail } from "@/lib/serializers";
import { queryPerfumes, withRatings } from "@/lib/catalog";
import { createPerfume } from "@/lib/products";
import { perfumeListArgs } from "@/types";
import type { RatingSummary } from "@/types";

export const runtime = "nodejs";

const EMPTY_RATING: RatingSummary = {
  average: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

// ----------------------------------------------------------------------------
//  GET /api/perfumes — paginated, filtered catalog listing.
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const query = perfumeQuerySchema.parse(
      searchParamsToObject(req.nextUrl.searchParams),
    );

    // Explicit slug lookup (recently-viewed / compare hydration). Returns the
    // requested active perfumes preserving the caller's slug order.
    if (query.slugs) {
      const slugs = query.slugs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
      if (slugs.length === 0) {
        return apiSuccess([]);
      }
      const rows = await db.perfume.findMany({
        where: { slug: { in: slugs }, isActive: true },
        ...perfumeListArgs,
      });
      const items = await withRatings(rows);
      const order = new Map(slugs.map((slug, i) => [slug, i]));
      items.sort(
        (a, b) =>
          (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0),
      );
      return apiSuccess(items);
    }

    const { items, total } = await queryPerfumes(query);
    return apiSuccess(items, {
      pagination: buildPaginationMeta(total, query.page, query.limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ----------------------------------------------------------------------------
//  POST /api/perfumes — create a perfume with variants, images and notes.
//  Admin only.
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createPerfumeSchema.parse(await req.json());
    const perfume = await createPerfume(input);
    return apiSuccess(serializePerfumeDetail(perfume, EMPTY_RATING), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
