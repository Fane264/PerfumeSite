"use client";

import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { usePerfumesBySlugs } from "@/hooks/use-perfumes";
import { PerfumeCard } from "@/components/shop/perfume-card";

/**
 * Horizontal carousel of recently-viewed perfumes. Renders nothing until there
 * are at least two items. `excludeSlug` keeps the current product out of its own
 * "recently viewed" rail.
 */
export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const { slugs, clear } = useRecentlyViewed();
  const visibleSlugs = slugs.filter((s) => s !== excludeSlug).slice(0, 8);
  const { data: perfumes } = usePerfumesBySlugs(visibleSlugs);

  const items = perfumes ?? [];
  if (visibleSlugs.length < 2 || items.length < 2) return null;

  return (
    <section className="border-t border-border py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-luxe text-gold">
            Istoricul tău
          </p>
          <h2 className="font-serif text-3xl font-light text-cream md:text-4xl">
            Văzute recent
          </h2>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-gold"
        >
          Șterge tot
        </button>
      </div>

      <div className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4 scrollbar-luxe">
        {items.map((perfume) => (
          <div key={perfume.id} className="w-64 shrink-0 snap-start sm:w-72">
            <PerfumeCard perfume={perfume} />
          </div>
        ))}
      </div>
    </section>
  );
}
