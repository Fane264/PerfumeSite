import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_PERFUMES = 5;
const MAX_HOUSES = 3;

export interface SearchSuggestionPerfume {
  id: string;
  name: string;
  slug: string;
  houseName: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
}

export interface SearchSuggestionHouse {
  id: string;
  name: string;
  slug: string;
}

export interface SearchSuggestions {
  query: string;
  perfumes: SearchSuggestionPerfume[];
  houses: SearchSuggestionHouse[];
}

// GET /api/search/suggestions?q=... — DB-backed autocomplete fallback used when
// Algolia is not configured. Returns up to 5 perfumes + 3 houses.
export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return apiSuccess<SearchSuggestions>({ query: q, perfumes: [], houses: [] });
    }

    const [perfumeRows, houseRows] = await Promise.all([
      db.perfume.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { house: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          house: { select: { name: true } },
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
          variants: {
            where: { isActive: true },
            select: { price: true, currency: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        take: MAX_PERFUMES,
      }),
      db.perfumeHouse.findMany({
        where: { isActive: true, name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
        take: MAX_HOUSES,
      }),
    ]);

    const perfumes: SearchSuggestionPerfume[] = perfumeRows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      houseName: p.house.name,
      imageUrl: p.images[0]?.url ?? null,
      price: p.variants[0] ? toNumber(p.variants[0].price) : null,
      currency: p.variants[0]?.currency ?? "RON",
    }));

    return apiSuccess<SearchSuggestions>({ query: q, perfumes, houses: houseRows });
  } catch (error) {
    return handleApiError(error);
  }
}
