"use client";

import { useState } from "react";
import {
  useMenu,
  useRefinementList,
  useToggleRefinement,
  useRange,
  useClearRefinements,
  type UseMenuProps,
  type UseRefinementListProps,
} from "react-instantsearch";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

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

/** Single-select facet rendered as a radio-style list, sorted by count. */
function MenuFacet(props: UseMenuProps) {
  const t = useTranslations("catalog");
  const { items, refine } = useMenu({ ...props, limit: 12 });
  if (items.length === 0)
    return <p className="text-xs text-muted-2">{t("noResult")}</p>;
  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-luxe">
      {items.map((item) => (
        <li key={item.value}>
          <button
            type="button"
            onClick={() => refine(item.value)}
            className={cn(
              "flex w-full items-center justify-between py-1 text-left text-sm transition-colors",
              item.isRefined
                ? "text-gold"
                : "text-muted-foreground hover:text-cream",
            )}
          >
            <span>{item.label}</span>
            <span className="text-xs text-muted-2">{item.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Multi-select facet (checkbox list). */
function RefinementFacet(props: UseRefinementListProps) {
  const t = useTranslations("catalog");
  const { items, refine } = useRefinementList({ ...props, limit: 40 });
  if (items.length === 0)
    return <p className="text-xs text-muted-2">{t("noResult")}</p>;
  return (
    <ul className="max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-luxe">
      {items.map((item) => (
        <li key={item.value}>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground hover:text-cream">
            <span
              className={cn(
                "flex size-4 items-center justify-center border transition-colors",
                item.isRefined
                  ? "border-gold bg-gold text-background"
                  : "border-border",
              )}
            >
              {item.isRefined && <span className="text-[10px]">✓</span>}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={item.isRefined}
              onChange={() => refine(item.value)}
            />
            <span className="flex-1">{item.label}</span>
            <span className="text-xs text-muted-2">{item.count}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function PriceRange() {
  const { range, start, refine } = useRange({ attribute: "priceMin" });
  const min = range.min ?? 0;
  const max = range.max ?? 0;
  const from = Number.isFinite(start[0]) ? (start[0] as number) : min;
  const to = Number.isFinite(start[1]) ? (start[1] as number) : max;

  if (max <= min) return <p className="text-xs text-muted-2">—</p>;

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={from}
          onChange={(e) => refine([Number(e.target.value), to])}
          className="h-9 w-full border border-input bg-surface2 px-2 text-sm text-cream focus:border-gold focus:outline-none"
          aria-label="Preț minim"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          min={min}
          max={max}
          value={to}
          onChange={(e) => refine([from, Number(e.target.value)])}
          className="h-9 w-full border border-input bg-surface2 px-2 text-sm text-cream focus:border-gold focus:outline-none"
          aria-label="Preț maxim"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {min} – {max} RON
      </p>
    </div>
  );
}

function AvailableToggle() {
  const t = useTranslations("catalog");
  const { value, refine } = useToggleRefinement({ attribute: "available" });
  return (
    <label className="flex items-center justify-between text-sm text-muted-foreground">
      {t("inStockOnly")}
      <Switch
        checked={value.isRefined}
        onCheckedChange={() => refine(value)}
        aria-label={t("inStockOnly")}
      />
    </label>
  );
}

export function AlgoliaFilterSidebar() {
  const t = useTranslations("catalog");
  const { refine: clearAll, canRefine } = useClearRefinements();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-light text-cream">
          {t("filters")}
        </h2>
        <button
          type="button"
          onClick={clearAll}
          disabled={!canRefine}
          className="text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-gold disabled:opacity-40"
        >
          {t("reset")}
        </button>
      </div>

      <Section title={t("house")}>
        <MenuFacet attribute="house" sortBy={["count:desc", "name:asc"]} />
      </Section>

      <Section title={t("family")}>
        <MenuFacet attribute="family" sortBy={["count:desc", "name:asc"]} />
      </Section>

      <Section title={t("gender")}>
        <MenuFacet attribute="gender" sortBy={["count:desc", "name:asc"]} />
      </Section>

      <Section title={t("notes")} defaultOpen={false}>
        <RefinementFacet attribute="notes" operator="and" />
      </Section>

      <Section title={t("price")}>
        <PriceRange />
      </Section>

      <Section title={t("availability")}>
        <AvailableToggle />
      </Section>
    </div>
  );
}
