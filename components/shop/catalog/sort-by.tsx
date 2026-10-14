"use client";

import { useSortBy } from "react-instantsearch";
import { useTranslations } from "next-intl";
import { ALGOLIA_INDICES } from "@/lib/algolia-search";

/** Index-replica sort selector. */
export function SortBy() {
  const t = useTranslations("catalog");
  const items = [
    { label: t("sortPopularity"), value: ALGOLIA_INDICES.default },
    { label: t("sortNewest"), value: ALGOLIA_INDICES.newest },
    { label: t("sortPriceAsc"), value: ALGOLIA_INDICES.priceAsc },
    { label: t("sortPriceDesc"), value: ALGOLIA_INDICES.priceDesc },
  ];
  const { currentRefinement, options, refine } = useSortBy({ items });
  // `options` is provided by the widget; fall back to our static list for types.
  const list = options.length > 0 ? options : items;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("sort")}</span>
      <select
        value={currentRefinement}
        onChange={(e) => refine(e.target.value)}
        className="border border-border bg-surface px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
      >
        {list.map((item) => (
          <option key={item.value} value={item.value} className="bg-surface">
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
