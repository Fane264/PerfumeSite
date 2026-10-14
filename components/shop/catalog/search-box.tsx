"use client";

import { useEffect, useState } from "react";
import { useSearchBox, useInstantSearch } from "react-instantsearch";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

/** Algolia-powered search input with a live result count. */
export function SearchBox() {
  const t = useTranslations("catalog");
  const { query, refine } = useSearchBox();
  const { results } = useInstantSearch();
  const [value, setValue] = useState(query);

  // Keep local input in sync when the query changes via the URL / routing.
  useEffect(() => setValue(query), [query]);

  // Debounce refinements so we don't fire a request on every keystroke.
  useEffect(() => {
    if (value === query) return;
    const id = setTimeout(() => refine(value), 250);
    return () => clearTimeout(id);
  }, [value, query, refine]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAria")}
          className="h-12 w-full border-b border-border bg-transparent pl-9 pr-9 text-base text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              refine("");
            }}
            aria-label={t("clearSearch")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cream"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("searchCount", { count: results.nbHits })}
        {query ? ` ${t("searchFor", { query })}` : ""}
      </p>
    </div>
  );
}
