"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { InstantSearchNext } from "react-instantsearch-nextjs";
import { Configure } from "react-instantsearch";
import { searchClient, ALGOLIA_INDEX } from "@/lib/algolia-search";
import { SearchBox } from "@/components/shop/catalog/search-box";
import { SortBy } from "@/components/shop/catalog/sort-by";
import { ProductHits } from "@/components/shop/catalog/product-hits";
import { AlgoliaFilterSidebar } from "@/components/shop/catalog/algolia-filter-sidebar";

/**
 * Algolia InstantSearch catalog. `InstantSearchNext` renders the first page on
 * the server (SSR) and syncs refinement state to the URL via its built-in
 * routing, so filters survive refreshes and are shareable.
 */
export function AlgoliaCatalog() {
  const t = useTranslations("catalog");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8 border-b border-border pb-8">
        <p className="text-xs uppercase tracking-luxe text-gold">{t("eyebrow")}</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-6xl">
          {t("title")}
        </h1>
      </div>

      <InstantSearchNext
        indexName={ALGOLIA_INDEX}
        searchClient={searchClient}
        routing
        future={{ preserveSharedStateOnUnmount: true }}
      >
        <Configure hitsPerPage={12} />

        <div className="mb-8">
          <SearchBox />
        </div>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <AlgoliaFilterSidebar />
            </div>
          </aside>

          {/* Main column */}
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="mr-auto flex items-center gap-2 border border-border px-4 py-2 text-sm text-cream lg:hidden"
              >
                <SlidersHorizontal className="size-4" /> {t("filters")}
              </button>
              <SortBy />
            </div>

            <ProductHits />
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
                <AlgoliaFilterSidebar />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="mt-6 h-12 w-full bg-gold text-sm font-medium uppercase tracking-widest text-background"
                >
                  {t("viewResultsShort")}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </InstantSearchNext>
    </div>
  );
}
