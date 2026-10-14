"use client";

import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { apiFetch, apiFetchEnvelope, buildPerfumeQuery } from "@/lib/api-client";
import type { ApiPerfumeDetail, ApiPerfumeListItem } from "@/types";

export interface CatalogParams {
  q?: string;
  house?: string;
  family?: string;
  notes?: string;
  gender?: string;
  sizeML?: number;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  featured?: boolean;
  sort?: string;
}

const PAGE_LIMIT = 12;

/** Paginated catalog query backing the listing grid's infinite scroll. */
export function useInfinitePerfumes(params: CatalogParams) {
  return useInfiniteQuery({
    queryKey: ["perfumes", params],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const query = buildPerfumeQuery({
        ...params,
        page: pageParam,
        limit: PAGE_LIMIT,
      });
      const envelope = await apiFetchEnvelope<ApiPerfumeListItem[]>(
        `/api/perfumes${query}`,
      );
      return {
        items: envelope.data ?? [],
        pagination: envelope.meta?.pagination,
      };
    },
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p?.hasNextPage ? p.page + 1 : undefined;
    },
    staleTime: 30_000,
  });
}

/** Full detail (incl. olfactory pyramid) for each slug — backs the compare grid. */
export function usePerfumeDetails(slugs: string[]) {
  return useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["perfume-detail", slug],
      queryFn: () => apiFetch<ApiPerfumeDetail>(`/api/perfumes/${slug}`),
      staleTime: 60_000,
    })),
  });
}

/** Fetch a set of perfumes by slug (recently-viewed / compare hydration). */
export function usePerfumesBySlugs(slugs: string[]) {
  return useQuery({
    queryKey: ["perfumes-by-slugs", [...slugs].sort()],
    queryFn: () =>
      apiFetch<ApiPerfumeListItem[]>(
        `/api/perfumes?slugs=${encodeURIComponent(slugs.join(","))}`,
      ),
    enabled: slugs.length > 0,
    staleTime: 60_000,
  });
}
