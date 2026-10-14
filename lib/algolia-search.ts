import algoliasearch, { type SearchClient } from "algoliasearch";

// ---------------------------------------------------------------------------
//  Browser-safe Algolia client (search-only key). Imported by client catalog
//  components. Never import the admin client (`lib/algolia.ts`) here.
// ---------------------------------------------------------------------------

const appId =
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? process.env.ALGOLIA_APP_ID ?? "";
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? "";

/** Base index name + sort replicas (created in the Algolia dashboard). */
export const ALGOLIA_INDEX =
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ??
  process.env.ALGOLIA_INDEX_NAME ??
  "perfumes";

export const ALGOLIA_INDICES = {
  default: ALGOLIA_INDEX,
  priceAsc: `${ALGOLIA_INDEX}_price_asc`,
  priceDesc: `${ALGOLIA_INDEX}_price_desc`,
  newest: `${ALGOLIA_INDEX}_newest`,
} as const;

/** Whether public Algolia credentials are present. */
export const isAlgoliaConfigured = Boolean(appId && searchKey);

/**
 * Shared search client. When credentials are absent we return a stub whose
 * `search` resolves to empty results, so the catalog renders an empty state
 * instead of throwing during local development.
 */
export const searchClient: SearchClient = isAlgoliaConfigured
  ? algoliasearch(appId, searchKey)
  : ({
      search: () =>
        Promise.resolve({
          results: [
            {
              hits: [],
              nbHits: 0,
              nbPages: 0,
              page: 0,
              processingTimeMS: 0,
              hitsPerPage: 0,
              exhaustiveNbHits: true,
              query: "",
              params: "",
            },
          ],
        }),
      searchForFacetValues: () => Promise.resolve([]),
    } as unknown as SearchClient);

/** Shape of an Algolia perfume hit (mirrors `PerfumeSearchRecord`). */
export interface PerfumeHit {
  objectID: string;
  name: string;
  slug: string;
  description: string;
  house: string;
  houseSlug: string;
  family: string;
  familySlug: string;
  familyColor: string;
  gender: string;
  concentration: string;
  perfumer: string | null;
  launchYear: number | null;
  notes: string[];
  minPrice: number;
  maxPrice: number;
  priceMin: number;
  currency: string;
  isFeatured: boolean;
  inStock: boolean;
  available: boolean;
  imageUrl: string | null;
}
