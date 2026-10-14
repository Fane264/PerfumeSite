"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/store/currency-store";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** RON / EUR display-currency pill toggle for the navbar. */
export function CurrencyToggle({ className }: { className?: string }) {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  // Avoid hydration mismatch — the store hydrates from localStorage on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border p-0.5",
        className,
      )}
      role="group"
      aria-label="Monedă afișată"
    >
      {SUPPORTED_CURRENCIES.map((c) => {
        const active = mounted && currency === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
              active
                ? "bg-gold text-background"
                : "text-muted-foreground hover:text-cream",
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
