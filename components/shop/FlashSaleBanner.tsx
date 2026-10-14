"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Flame, X, ArrowRight } from "lucide-react";
import { flashSalesApi } from "@/lib/api-client";
import { CountdownTimer } from "@/components/shop/CountdownTimer";

const DISMISS_KEY = "flash_sale_dismissed";

/**
 * Sticky promo bar above the navbar announcing the live flash sale with a
 * countdown. Dismissable for the session (keyed by sale id so a new sale
 * re-appears). Renders nothing when no sale is active or it was dismissed.
 */
export function FlashSaleBanner() {
  const { data } = useQuery({
    queryKey: ["flash-sale", "active"],
    queryFn: flashSalesApi.active,
    staleTime: 60_000,
    retry: false,
  });

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!data) return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === data.id);
  }, [data]);

  if (!data || dismissed) return null;

  return (
    <div
      role="alert"
      aria-label={`Flash sale activ: ${data.title}`}
      className="relative z-[60]"
      style={{ backgroundColor: data.bannerColor }}
    >
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm font-medium text-white">
        <span className="flex items-center gap-1.5">
          <Flame className="size-4" />
          FLASH SALE: {data.title}
        </span>
        <span className="hidden sm:inline">— Se termină în</span>
        <CountdownTimer endsAt={data.endsAt} size="sm" className="text-white" />
        <Link
          href="/parfumuri?flashSale=true"
          className="ml-2 inline-flex items-center gap-1 underline-offset-2 hover:underline"
        >
          Vezi ofertele <ArrowRight className="size-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, data.id);
            setDismissed(true);
          }}
          aria-label="Închide"
          className="absolute right-4 text-white/80 transition-colors hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
