"use client";

import { useState } from "react";
import { Gift, Loader2, X, ChevronDown } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import {
  giftCardsApi,
  ApiError,
  type GiftCardValidationResult,
} from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AppliedGiftCard {
  code: string;
  currency: string;
  remainingValue: number;
  /** Amount that will actually be applied to this order. */
  applied: number;
}

/**
 * Collapsible "Ai un card cadou?" section for the checkout summary. Validates
 * the code against the current subtotal and reports the applied amount upward.
 * Stacks below the coupon (gift card is applied after the coupon).
 */
export function GiftCardInput({
  cartSubtotal,
  giftCard,
  onApply,
  onRemove,
}: {
  cartSubtotal: number;
  giftCard: AppliedGiftCard | null;
  onApply: (card: AppliedGiftCard) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const result: GiftCardValidationResult = await giftCardsApi.validate(
        trimmed,
        cartSubtotal,
      );
      onApply({
        code: result.code,
        currency: result.currency,
        remainingValue: result.remainingValue,
        applied: result.maxRedeemable,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Card cadou invalid");
    } finally {
      setLoading(false);
    }
  }

  if (giftCard) {
    return (
      <div className="mt-3 border border-gold/40 bg-gold/5 px-3 py-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-gold">
            <Gift className="size-4" /> {giftCard.code}
          </span>
          <button
            type="button"
            onClick={() => {
              onRemove();
              setCode("");
            }}
            aria-label="Elimină cardul cadou"
            className="text-muted-foreground hover:text-cream"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Se aplică {formatPrice(giftCard.applied, giftCard.currency)} · sold
          rămas {formatPrice(giftCard.remainingValue, giftCard.currency)}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm text-cream/80 transition-colors hover:text-gold"
      >
        <span className="flex items-center gap-2">
          <Gift className="size-4 text-gold" /> Ai un card cadou?
        </span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-3">
          <Label htmlFor="gift-card" className="mb-1.5 block">
            Cod card cadou
          </Label>
          <div className="flex gap-2">
            <Input
              id="gift-card"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
              placeholder="GIFT-XXXX-XXXX"
              className="uppercase"
            />
            <button
              type="button"
              onClick={apply}
              disabled={loading || !code.trim()}
              className="shrink-0 border border-gold px-4 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Aplică"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
