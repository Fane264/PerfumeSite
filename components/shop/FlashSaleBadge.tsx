"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Red "SALE -X%" badge shown on product cards and the buy box when a variant is
 * in a live flash sale.
 */
export function FlashSaleBadge({
  discountLabel,
  className,
}: {
  discountLabel: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-error px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white",
        className,
      )}
    >
      <Flame className="size-3" /> Sale {discountLabel}
    </span>
  );
}
