import algoliasearch, { type SearchClient, type SearchIndex } from "algoliasearch";
import { env } from "./env";

// Algolia client for server-side indexing. Uses the admin key, so this module
// must never be imported into client components. When credentials are absent
// the helpers become no-ops, keeping local/dev environments runnable without
// an Algolia account.

const appId = env.ALGOLIA_APP_ID;
const adminKey = env.ALGOLIA_ADMIN_API_KEY;
const indexName = env.ALGOLIA_INDEX_NAME ?? "perfumes";

const client: SearchClient | null =
  appId && adminKey ? algoliasearch(appId, adminKey) : null;

const perfumeIndex: SearchIndex | null = client
  ? client.initIndex(indexName)
  : null;

/** Flattened, search-optimized representation of a perfume. */
export interface PerfumeSearchRecord {
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
  /** Alias of `minPrice` exposed for the price `useRange` refinement. */
  priceMin: number;
  currency: string;
  isFeatured: boolean;
  inStock: boolean;
  /** Alias of `inStock` exposed for the `useToggleRefinement`. */
  available: boolean;
  imageUrl: string | null;
  /** Unix ms used by the `_newest` sort replica. */
  createdAtTimestamp: number;
}

/** Create or update a perfume's search record. No-op without credentials. */
export async function indexPerfume(record: PerfumeSearchRecord): Promise<void> {
  if (!perfumeIndex) {
    console.warn("[Algolia] Skipping indexPerfume — credentials not configured");
    return;
  }
  await perfumeIndex.saveObject(record);
}

/** Batch upsert multiple perfume records (used by the seed/reindex jobs). */
export async function indexPerfumes(
  records: PerfumeSearchRecord[],
): Promise<void> {
  if (!perfumeIndex || records.length === 0) return;
  await perfumeIndex.saveObjects(records);
}

/** Remove a perfume from the search index. No-op without credentials. */
export async function removePerfume(objectID: string): Promise<void> {
  if (!perfumeIndex) {
    console.warn("[Algolia] Skipping removePerfume — credentials not configured");
    return;
  }
  await perfumeIndex.deleteObject(objectID);
}

/** Configure index settings (searchable attributes, facets, sort replicas). */
export async function configurePerfumeIndex(): Promise<void> {
  if (!perfumeIndex || !client) return;

  const priceAsc = `${indexName}_price_asc`;
  const priceDesc = `${indexName}_price_desc`;
  const newest = `${indexName}_newest`;

  await perfumeIndex.setSettings({
    searchableAttributes: ["name", "house", "notes", "perfumer", "description"],
    attributesForFaceting: [
      "searchable(house)",
      "searchable(notes)",
      "family",
      "gender",
      "concentration",
      "available",
      "inStock",
      "isFeatured",
      "filterOnly(houseSlug)",
      "filterOnly(familySlug)",
    ],
    numericAttributesForFiltering: ["priceMin", "minPrice", "maxPrice"],
    customRanking: ["desc(isFeatured)", "desc(inStock)"],
    replicas: [priceAsc, priceDesc, newest],
  });

  // Per-replica ranking.
  await client.initIndex(priceAsc).setSettings({
    ranking: ["asc(priceMin)", "typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"],
  });
  await client.initIndex(priceDesc).setSettings({
    ranking: ["desc(priceMin)", "typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"],
  });
  await client.initIndex(newest).setSettings({
    ranking: ["desc(createdAtTimestamp)", "typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"],
  });
}

export { perfumeIndex };

/**
 * Render an InstantSearch tree on the server to capture its initial results,
 * so the catalog's first paint is fully populated (SSR). Returns `undefined`
 * when rendering fails (e.g. credentials missing), letting the client hydrate
 * normally without blocking the page.
 */
export async function getAlgoliaServerState(
  element: import("react").ReactElement,
): Promise<
  import("react-instantsearch").InstantSearchServerState | undefined
> {
  try {
    const { getServerState } = await import("react-instantsearch");
    const { renderToString } = await import("react-dom/server");
    return await getServerState(element, { renderToString });
  } catch (err) {
    console.error("[Algolia] getAlgoliaServerState failed:", err);
    return undefined;
  }
}
