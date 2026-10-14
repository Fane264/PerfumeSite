"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { loyaltyApi } from "@/lib/api-client";
import { TIER_META } from "@/lib/loyalty-ui";

/**
 * Compact loyalty chip for the navbar (next to the user button). Shows the
 * member's tier + balance with a hover tooltip. Renders nothing until the
 * balance loads or if the request fails (e.g. signed-out) so it never flickers
 * an error into the header. Wrap usage in Clerk's <SignedIn>.
 */
export function LoyaltyBadge({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["loyalty", "badge"],
    queryFn: loyaltyApi.get,
    staleTime: 60_000,
    retry: false,
  });

  if (!data) return null;
  const meta = TIER_META[data.tier];

  return (
    <Link
      href="/cont/puncte"
      aria-label={`${data.balance} puncte · Tier ${meta.label}`}
      className={cn(
        "group relative hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors sm:flex",
        meta.badge,
        className,
      )}
    >
      <Sparkles className="size-3" />
      <span>{data.balance.toLocaleString("ro-RO")}</span>
      <span className="hidden uppercase md:inline">{meta.label}</span>

      <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-sm border border-border bg-surface px-3 py-1.5 text-xs text-cream opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {data.balance.toLocaleString("ro-RO")} puncte · Tier {meta.label}
      </span>
    </Link>
  );
}
