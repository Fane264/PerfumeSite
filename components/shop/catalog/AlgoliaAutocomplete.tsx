"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type {
  SearchSuggestions,
  SearchSuggestionPerfume,
  SearchSuggestionHouse,
} from "@/app/api/search/suggestions/route";

// Flat, keyboard-navigable list of all selectable rows in the dropdown.
type Row =
  | { kind: "perfume"; perfume: SearchSuggestionPerfume }
  | { kind: "house"; house: SearchSuggestionHouse }
  | { kind: "all" };

const EMPTY: SearchSuggestions = { query: "", perfumes: [], houses: [] };

/**
 * Search autocomplete with preview cards. Backed by `/api/search/suggestions`
 * (DB-backed, so it works with or without Algolia configured). Renders an inline
 * dropdown on desktop and a full-screen panel on mobile.
 */
export function AlgoliaAutocomplete({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchSuggestions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the flat row list so arrow keys can traverse perfumes → houses → "all".
  const rows: Row[] = [
    ...data.perfumes.map((perfume) => ({ kind: "perfume", perfume }) as const),
    ...data.houses.map((house) => ({ kind: "house", house }) as const),
    ...(query.trim().length >= 2 ? [{ kind: "all" } as const] : []),
  ];

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  // Debounced fetch on query change.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await apiFetch<SearchSuggestions>(
          `/api/search/suggestions?q=${encodeURIComponent(q)}`,
        );
        setData(res);
      } catch {
        setData(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, close]);

  function go(row: Row) {
    if (row.kind === "perfume") router.push(`/parfumuri/${row.perfume.slug}`);
    else if (row.kind === "house") router.push(`/case/${row.house.slug}`);
    else router.push(`/parfumuri?q=${encodeURIComponent(query.trim())}`);
    close();
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) go(row);
      else if (query.trim().length >= 2) {
        router.push(`/parfumuri?q=${encodeURIComponent(query.trim())}`);
        close();
        setQuery("");
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Caută parfumuri"
        className={cn(
          "flex size-10 items-center justify-center rounded-full text-cream transition-colors hover:text-gold",
          iconClassName,
        )}
      >
        <Search className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          >
            <div
              ref={containerRef}
              className={cn(
                "mx-auto mt-0 w-full bg-surface shadow-2xl sm:mt-20 sm:max-w-2xl sm:rounded-lg",
                "flex h-full flex-col sm:h-auto sm:max-h-[80vh]",
                className,
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Căutare"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(-1);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Caută parfumuri, case…"
                  aria-label="Caută"
                  className="h-9 flex-1 bg-transparent text-base text-cream placeholder:text-muted-foreground focus:outline-none"
                />
                {loading && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Închide căutarea"
                  className="text-muted-foreground hover:text-cream"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto">
                {query.trim().length < 2 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Tastează cel puțin 2 caractere pentru a căuta.
                  </p>
                ) : !loading &&
                  data.perfumes.length === 0 &&
                  data.houses.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Niciun rezultat pentru „{query.trim()}”.
                  </p>
                ) : (
                  <div className="py-2">
                    {data.perfumes.length > 0 && (
                      <Section label="Parfumuri">
                        {data.perfumes.map((perfume) => {
                          const idx = rows.findIndex(
                            (r) => r.kind === "perfume" && r.perfume.id === perfume.id,
                          );
                          return (
                            <PerfumeRow
                              key={perfume.id}
                              perfume={perfume}
                              active={active === idx}
                              onClick={() => go({ kind: "perfume", perfume })}
                              onHover={() => setActive(idx)}
                            />
                          );
                        })}
                      </Section>
                    )}
                    {data.houses.length > 0 && (
                      <Section label="Case">
                        {data.houses.map((house) => {
                          const idx = rows.findIndex(
                            (r) => r.kind === "house" && r.house.id === house.id,
                          );
                          return (
                            <button
                              key={house.id}
                              type="button"
                              onClick={() => go({ kind: "house", house })}
                              onMouseEnter={() => setActive(idx)}
                              className={cn(
                                "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                                active === idx ? "bg-surface2" : "hover:bg-surface2",
                              )}
                            >
                              <span className="text-cream">{house.name}</span>
                            </button>
                          );
                        })}
                      </Section>
                    )}
                    <button
                      type="button"
                      onClick={() => go({ kind: "all" })}
                      onMouseEnter={() => setActive(rows.length - 1)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-gold transition-colors",
                        active === rows.length - 1 ? "bg-surface2" : "hover:bg-surface2",
                      )}
                    >
                      <span>Caută „{query.trim()}” în toate parfumurile</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <p className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function PerfumeRow({
  perfume,
  active,
  onClick,
  onHover,
}: {
  perfume: SearchSuggestionPerfume;
  active: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
        active ? "bg-surface2" : "hover:bg-surface2",
      )}
    >
      <span className="relative size-11 shrink-0 overflow-hidden rounded-sm border border-border bg-surface2">
        {perfume.imageUrl && (
          <Image
            src={perfume.imageUrl}
            alt={perfume.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-cream">{perfume.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {perfume.houseName}
        </span>
      </span>
      {perfume.price !== null && (
        <span className="shrink-0 text-sm text-gold">
          {formatPrice(perfume.price, perfume.currency)}
        </span>
      )}
    </button>
  );
}
