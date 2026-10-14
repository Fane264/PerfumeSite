"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useInfiniteHits,
  useInstantSearch,
  useClearRefinements,
} from "react-instantsearch";
import { PerfumeCard } from "@/components/shop/perfume-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PerfumeHit } from "@/lib/algolia-search";
import type {
  ApiPerfumeListItem,
  Gender,
  Concentration,
} from "@/types";

/** Map an Algolia hit into the `ApiPerfumeListItem` shape `PerfumeCard` needs. */
function hitToListItem(hit: PerfumeHit): ApiPerfumeListItem {
  return {
    id: hit.objectID,
    name: hit.name,
    slug: hit.slug,
    gender: hit.gender as Gender,
    concentration: hit.concentration as Concentration,
    launchYear: hit.launchYear,
    isFeatured: hit.isFeatured,
    isComingSoon: false,
    house: {
      id: hit.objectID,
      name: hit.house,
      slug: hit.houseSlug,
      logoUrl: null,
      country: "",
    },
    family: {
      id: hit.familySlug,
      name: hit.family,
      slug: hit.familySlug,
      colorHex: hit.familyColor || "#C8A951",
      iconName: null,
    },
    primaryImage: hit.imageUrl
      ? {
          id: hit.objectID,
          url: hit.imageUrl,
          altText: hit.name,
          position: 0,
          isPrimary: true,
        }
      : null,
    priceRange: {
      min: hit.minPrice,
      max: hit.maxPrice,
      currency: hit.currency || "RON",
    },
    inStock: hit.inStock,
    rating: { average: 0, count: 0 },
  };
}

export function ProductHits() {
  const t = useTranslations("catalog");
  const { items, isLastPage, showMore } = useInfiniteHits<PerfumeHit>();
  const { status, results } = useInstantSearch();
  const { refine: clearAll } = useClearRefinements();

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLastPage) showMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isLastPage, showMore]);

  const loading = status === "loading" || status === "stalled";

  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            <Skeleton className="aspect-[3/4] w-full" />
            <Skeleton className="mt-4 h-3 w-1/3" />
            <Skeleton className="mt-2 h-5 w-2/3" />
            <Skeleton className="mt-3 h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border py-24 text-center">
        <p className="font-serif text-3xl font-light text-cream">
          {t("noPerfumeFound")}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("noPerfumeFoundDesc")}
        </p>
        <button
          type="button"
          onClick={() => clearAll()}
          className="mt-2 border border-gold px-6 py-2.5 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          {t("resetFilters")}
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        layout
        className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((hit, i) => (
          <PerfumeCard
            key={hit.objectID}
            perfume={hitToListItem(hit)}
            priority={i < 4}
          />
        ))}
      </motion.div>

      <div ref={sentinelRef} className="h-10" />
      {loading && items.length > 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      )}
      {isLastPage && (results?.nbHits ?? 0) > 0 && (
        <p className="py-8 text-center text-xs uppercase tracking-widest text-muted-2">
          {t("endOfList")}
        </p>
      )}
    </>
  );
}
