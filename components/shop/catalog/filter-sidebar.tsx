"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { DECANT_SIZES_ML } from "@/lib/constants";

export interface FilterState {
  q: string;
  house: string | null;
  family: string | null;
  notes: string[];
  sizeML: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  available: boolean;
}

export interface FilterOptions {
  houses: { name: string; slug: string }[];
  families: { name: string; slug: string; colorHex: string }[];
  notes: { name: string; slug: string }[];
}

interface FilterSidebarProps {
  options: FilterOptions;
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

const PRICE_MAX = 500;

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium uppercase tracking-wide text-cream"
      >
        {title}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  options,
  filters,
  onChange,
  onReset,
}: FilterSidebarProps) {
  const t = useTranslations("catalog");
  // Debounced search.
  const [search, setSearch] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setSearch(filters.q), [filters.q]);
  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ q: value }), 300);
  }

  // Local price range, committed to the URL on slider release.
  const [price, setPrice] = useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? PRICE_MAX,
  ]);
  useEffect(() => {
    setPrice([filters.minPrice ?? 0, filters.maxPrice ?? PRICE_MAX]);
  }, [filters.minPrice, filters.maxPrice]);

  function toggleNote(slug: string) {
    const next = filters.notes.includes(slug)
      ? filters.notes.filter((n) => n !== slug)
      : [...filters.notes, slug];
    onChange({ notes: next });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-light text-cream">
          {t("filters")}
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-gold"
        >
          {t("reset")}
        </button>
      </div>

      <Section title={t("search")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("searchPlaceholderShort")}
            aria-label={t("searchAria")}
            className="h-10 w-full border border-input bg-surface2 pl-9 pr-8 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cream"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </Section>

      <Section title={t("house")}>
        <ul className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-luxe">
          {options.houses.map((house) => {
            const active = filters.house === house.slug;
            return (
              <li key={house.slug}>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ house: active ? null : house.slug })
                  }
                  className={cn(
                    "flex w-full items-center justify-between py-1 text-left text-sm transition-colors",
                    active ? "text-gold" : "text-muted-foreground hover:text-cream",
                  )}
                >
                  {house.name}
                  {active && <span className="text-gold">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t("family")}>
        <ul className="space-y-1">
          {options.families.map((family) => {
            const active = filters.family === family.slug;
            return (
              <li key={family.slug}>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ family: active ? null : family.slug })
                  }
                  className={cn(
                    "flex w-full items-center gap-2.5 py-1 text-left text-sm transition-colors",
                    active ? "text-gold" : "text-muted-foreground hover:text-cream",
                  )}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: family.colorHex }}
                  />
                  {family.name}
                  {active && <span className="ml-auto text-gold">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {options.notes.length > 0 && (
        <Section title={t("notes")} defaultOpen={false}>
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-luxe">
            {options.notes.map((note) => {
              const checked = filters.notes.includes(note.slug);
              return (
                <li key={note.slug}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground hover:text-cream">
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center border transition-colors",
                        checked
                          ? "border-gold bg-gold text-background"
                          : "border-border",
                      )}
                    >
                      {checked && <span className="text-[10px]">✓</span>}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleNote(note.slug)}
                    />
                    {note.name}
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={t("size")}>
        <div className="flex flex-wrap gap-2">
          {DECANT_SIZES_ML.map((size) => {
            const active = filters.sizeML === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ sizeML: active ? null : size })}
                className={cn(
                  "border px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-gold text-gold"
                    : "border-border text-muted-foreground hover:border-gold/50 hover:text-cream",
                )}
              >
                {size} ml
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("price")}>
        <Slider
          min={0}
          max={PRICE_MAX}
          step={10}
          value={price}
          onValueChange={(v) => setPrice([v[0] ?? 0, v[1] ?? PRICE_MAX])}
          onValueCommit={(v) => {
            const lo = v[0] ?? 0;
            const hi = v[1] ?? PRICE_MAX;
            onChange({
              minPrice: lo > 0 ? lo : null,
              maxPrice: hi < PRICE_MAX ? hi : null,
            });
          }}
          aria-label="Interval de preț"
        />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{price[0]} RON</span>
          <span>
            {price[1]}
            {price[1] >= PRICE_MAX ? "+" : ""} RON
          </span>
        </div>
      </Section>

      <Section title={t("availability")}>
        <label className="flex items-center justify-between text-sm text-muted-foreground">
          {t("inStockOnly")}
          <Switch
            checked={filters.available}
            onCheckedChange={(c) => onChange({ available: c })}
            aria-label={t("inStockOnly")}
          />
        </label>
      </Section>
    </div>
  );
}
