"use client";

import { useState } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import toast from "react-hot-toast";
import { preordersApi, ApiError } from "@/lib/api-client";

interface PreOrderButtonProps {
  variantId: string;
  quantity?: number;
  /** ISO launch date, formatted as an estimated delivery line. */
  expectedDate?: string | null;
  disabled?: boolean;
}

function formatExpected(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Pre-order CTA, shown on products with `preOrderOpen`. Redirects to Stripe
 * Checkout just like a normal purchase, tagged as a pre-order server-side.
 */
export function PreOrderButton({
  variantId,
  quantity = 1,
  expectedDate,
  disabled,
}: PreOrderButtonProps) {
  const [loading, setLoading] = useState(false);
  const eta = formatExpected(expectedDate);

  async function onClick() {
    setLoading(true);
    try {
      const { sessionUrl } = await preordersApi.create(variantId, quantity);
      window.location.href = sessionUrl;
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Precomanda a eșuat",
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-purple-600/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          <PackageCheck className="size-3.5" /> Pre-order
        </span>
        {eta && (
          <span className="text-xs text-muted-foreground">
            Livrare estimată: {eta}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading || disabled}
        className="flex w-full items-center justify-center gap-2 bg-gold py-3.5 text-sm font-medium uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Precomandă acum"
        )}
      </button>
    </div>
  );
}
