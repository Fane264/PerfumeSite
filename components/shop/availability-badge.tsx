"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Availability = "in" | "low" | "out";

const STYLES: Record<Availability, string> = {
  in: "bg-success/15 text-success border-success/30",
  low: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  out: "bg-error/15 text-red-300 border-error/40",
};

const LABEL_KEYS: Record<Availability, string> = {
  in: "available",
  low: "lowStock",
  out: "unavailable",
};

/** Derive availability bucket from stock flags. */
export function availabilityFrom(inStock: boolean, isLow?: boolean): Availability {
  if (!inStock) return "out";
  return isLow ? "low" : "in";
}

export function AvailabilityBadge({
  state,
  className,
}: {
  state: Availability;
  className?: string;
}) {
  const t = useTranslations("catalog");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        STYLES[state],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(LABEL_KEYS[state])}
    </span>
  );
}
