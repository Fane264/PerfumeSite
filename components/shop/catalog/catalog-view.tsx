"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsStringLiteral,
} from "nuqs";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useInfinitePerfumes, type CatalogParams } from "@/hooks/use-perfumes";
import { PerfumeCard } from "@/components/shop/perfume-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterSidebar,
  type FilterState,
  type FilterOptions,
} from "@/components/shop/catalog/filter-sidebar";

const SORT_VALUES = ["popular", "newest", "price_asc", "price_desc"] as const;
type SortValue = (typeof SORT_VALUES)[number];

const SORT_LABEL_KEYS: Record<SortValue, string> = {
  popular: "sortPopularity",
  newest: "sortNewest",
  price_asc: "sortPriceAsc",
  price_desc: "sortPriceDesc",
};

const parsers = {
  q: parseAsString.withDefault(""),
  house: parseAsString,
  family: parseAsString,
  notes: parseAsArrayOf(parseAsString).withDefault([]),
  sizeML: parseAsInteger,
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  available: parseAsBoolean.withDefault(false),
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("newest"),
};

export function CatalogView({ options }: { options: FilterOptions }) {
  const t = useTranslations("catalog");
  const [state, setState] = useQueryStates(parsers, {
    shallow: false,
    history: "replace",
  });

  const filters: FilterState = {
    q: state.q,
    house: state.house,
    family: state.family,
    notes: state.notes,
    sizeML: state.sizeML,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    available: state.available,
  };

  const onChange = useCallback(
    (patch: Partial<FilterState>) => void setState(patch),
    [setState],
  );
  const onReset = useCallback(
    () =>
      void setState({
        q: "",
        house: null,
        family: null,
        notes: [],
        sizeML: null,
        minPrice: null,
        maxPrice: null,
        available: false,
      }),
    [setState],
  );

  const params: CatalogParams = useMemo(
    () => ({
      q: state.q || undefined,
      house: state.house ?? undefined,
      family: state.family ?? undefined,
      notes: state.notes.length ? state.notes.join(",") : undefined,
      sizeML: state.sizeML ?? undefined,
      minPrice: state.minPrice ?? undefined,
      maxPrice: state.maxPrice ?? undefined,
      available: state.available || undefined,
      sort: state.sort,
    }),
    [state],
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfinitePerfumes(params);

  const perfumes = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const chips = useActiveChips(state, options, onChange);

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8 border-b border-border pb-8">
        <p className="text-xs uppercase tracking-luxe text-gold">{t("eyebrow")}</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-6xl">
          {t("title")}
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <FilterSidebar
              options={options}
              filters={filters}
              onChange={onChange}
              onReset={onReset}
            />
          </div>
        </aside>

        {/* Main column */}
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? t("loading") : t("countFound", { count: total })}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex items-center gap-2 border border-border px-4 py-2 text-sm text-cream lg:hidden"
              >
                <SlidersHorizontal className="size-4" /> {t("filters")}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("sort")}</span>
                <select
                  value={state.sort}
                  onChange={(e) =>
                    setState({ sort: e.target.value as typeof state.sort })
                  }
                  className="border border-border bg-surface px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
                >
                  {SORT_VALUES.map((value) => (
                    <option key={value} value={value} className="bg-surface">
                      {t(SORT_LABEL_KEYS[value])}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-gold transition-colors hover:bg-gold/15"
                >
                  {chip.label}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <GridSkeleton />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : perfumes.length === 0 ? (
            <EmptyState onReset={onReset} />
          ) : (
            <>
              <motion.div
                layout
                className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3"
              >
                {perfumes.map((perfume, i) => (
                  <PerfumeCard
                    key={perfume.id}
                    perfume={perfume}
                    priority={i < 4}
                  />
                ))}
              </motion.div>

              <div ref={sentinelRef} className="h-10" />
              {isFetchingNextPage && (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-gold" />
                </div>
              )}
              {!hasNextPage && perfumes.length > 0 && (
                <p className="py-8 text-center text-xs uppercase tracking-widest text-muted-2">
                  {t("endOfList")}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-border bg-surface px-6 pb-8 pt-2 scrollbar-luxe lg:hidden"
            >
              <div className="sticky top-0 -mx-6 mb-2 flex justify-end bg-surface px-6 py-2">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("closeFilters")}
                  className="text-muted-foreground hover:text-cream"
                >
                  <X className="size-5" />
                </button>
              </div>
              <FilterSidebar
                options={options}
                filters={filters}
                onChange={onChange}
                onReset={onReset}
              />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mt-6 h-12 w-full bg-gold text-sm font-medium uppercase tracking-widest text-background"
              >
                {t("viewResults", { count: total })}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- helpers ---------------------------------------------------------------

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

function useActiveChips(
  state: {
    q: string;
    house: string | null;
    family: string | null;
    notes: string[];
    sizeML: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    available: boolean;
  },
  options: FilterOptions,
  onChange: (patch: Partial<FilterState>) => void,
): Chip[] {
  const t = useTranslations("catalog");
  const chips: Chip[] = [];
  if (state.q)
    chips.push({ key: "q", label: `“${state.q}”`, onRemove: () => onChange({ q: "" }) });
  if (state.house) {
    const name = options.houses.find((h) => h.slug === state.house)?.name ?? state.house;
    chips.push({ key: "house", label: name, onRemove: () => onChange({ house: null }) });
  }
  if (state.family) {
    const name =
      options.families.find((f) => f.slug === state.family)?.name ?? state.family;
    chips.push({ key: "family", label: name, onRemove: () => onChange({ family: null }) });
  }
  for (const slug of state.notes) {
    const name = options.notes.find((n) => n.slug === slug)?.name ?? slug;
    chips.push({
      key: `note-${slug}`,
      label: name,
      onRemove: () => onChange({ notes: state.notes.filter((n) => n !== slug) }),
    });
  }
  if (state.sizeML)
    chips.push({
      key: "size",
      label: `${state.sizeML} ml`,
      onRemove: () => onChange({ sizeML: null }),
    });
  if (state.minPrice != null || state.maxPrice != null)
    chips.push({
      key: "price",
      label: `${state.minPrice ?? 0}–${state.maxPrice ?? 500} RON`,
      onRemove: () => onChange({ minPrice: null, maxPrice: null }),
    });
  if (state.available)
    chips.push({
      key: "available",
      label: t("inStock"),
      onRemove: () => onChange({ available: false }),
    });
  return chips;
}

function GridSkeleton() {
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

function EmptyState({ onReset }: { onReset: () => void }) {
  const t = useTranslations("catalog");
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
        onClick={onReset}
        className="mt-2 border border-gold px-6 py-2.5 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
      >
        {t("resetFilters")}
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("catalog");
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-error/40 py-24 text-center">
      <p className="font-serif text-2xl font-light text-cream">
        {t("errorTitle")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="border border-gold px-6 py-2.5 text-sm uppercase tracking-widest text-gold hover:bg-gold hover:text-background"
      >
        {t("retry")}
      </button>
    </div>
  );
}
