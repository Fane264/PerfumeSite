"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { loyaltyApi } from "@/lib/api-client";
import { estimatePoints } from "@/lib/loyalty-ui";

interface PointsEarnPreviewProps {
  /** Order/line amount in RON the points are estimated from. */
  amount: number;
  /** "product" sits under add-to-cart; "cart" sits in the order summary. */
  variant?: "product" | "cart";
  className?: string;
}

/**
 * "Vei câștiga ~X puncte" affordance. If the visitor is a signed-in member the
 * estimate is scaled by their tier multiplier; otherwise it falls back to the
 * base rate. Never errors out — a failed loyalty fetch just uses BRONZE.
 */
export function PointsEarnPreview({
  amount,
  variant = "product",
  className,
}: PointsEarnPreviewProps) {
  const { data } = useQuery({
    queryKey: ["loyalty", "badge"],
    queryFn: loyaltyApi.get,
    staleTime: 60_000,
    retry: false,
  });

  const points = estimatePoints(amount, data?.tier ?? "BRONZE");
  if (points <= 0) return null;

  const label =
    variant === "cart"
      ? `Câștigi ${points.toLocaleString("ro-RO")} puncte cu această comandă`
      : `Vei câștiga ~${points.toLocaleString("ro-RO")} puncte cu această achiziție`;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Sparkles className="size-3.5 text-gold" />
      {label}
    </p>
  );
}
