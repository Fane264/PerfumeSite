"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { Check, Heart, Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFromRon } from "@/lib/currency";
import { useCurrencyStore } from "@/store/currency-store";
import { useAddToCart } from "@/hooks/use-cart";
import { useWishlist, useToggleWishlist } from "@/hooks/use-wishlist";
import { RestockNotify } from "@/components/shop/restock-notify";
import { PushNotificationButton } from "@/components/shop/PushNotificationButton";
import { SocialProof } from "@/components/shop/SocialProof";
import { TrustBadges } from "@/components/shop/TrustBadges";
import { FlashSaleBadge } from "@/components/shop/FlashSaleBadge";
import { CountdownTimer } from "@/components/shop/CountdownTimer";
import { PointsEarnPreview } from "@/components/shop/PointsEarnPreview";
import type { ApiVariant } from "@/types";

interface BuyBoxProps {
  perfumeId: string;
  slug: string;
  variants: ApiVariant[];
}

export function BuyBox({ perfumeId, slug, variants }: BuyBoxProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const addToCart = useAddToCart();
  const { wishlistedIds } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const wishlisted = wishlistedIds.has(perfumeId);

  const firstAvailable = variants.find((v) => v.inStock) ?? variants[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(
    firstAvailable?.id,
  );
  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;

  const storeCurrency = useCurrencyStore((s) => s.currency);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Prices are stored in RON; convert to the chosen display currency.
  const currency = mounted ? storeCurrency : "RON";

  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(t);
  }, [justAdded]);

  function handleAdd() {
    if (!selected) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    addToCart.mutate(
      { variantId: selected.id },
      { onSuccess: () => setJustAdded(true) },
    );
  }

  const canBuy = selected?.inStock ?? false;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs uppercase tracking-luxe text-muted-foreground">
          Alege mărimea
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {variants.map((variant) => {
            const active = variant.id === selected?.id;
            const perMl = variant.price / variant.sizeML;
            const disabled = !variant.inStock;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedId(variant.id)}
                className={cn(
                  "flex flex-col items-start border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-gold text-gold"
                    : "border-border text-cream hover:border-gold/50",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span
                  className={cn(
                    "font-serif text-lg",
                    disabled && "line-through",
                  )}
                >
                  {variant.sizeML} ml
                </span>
                {variant.flashSale ? (
                  <span className="flex items-baseline gap-1.5 text-sm">
                    <span className="font-medium text-error">
                      {formatFromRon(variant.flashSale.salePrice, currency)}
                    </span>
                    <span className="text-[11px] text-muted-foreground line-through">
                      {formatFromRon(variant.price, currency)}
                    </span>
                  </span>
                ) : (
                  <span className="text-sm">
                    {formatFromRon(variant.price, currency)}
                  </span>
                )}
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatFromRon(perMl, currency)}/ml
                </span>
              </button>
            );
          })}
        </div>

        {selected?.isLowStock && selected.inStock && (
          <p className="mt-3 text-sm text-amber-400">
            Doar {selected.availableQuantity} rămase!
          </p>
        )}

        <div className="mt-4">
          <SocialProof slug={slug} />
        </div>
      </div>

      {selected?.flashSale && selected.inStock && (
        <div className="border border-error/40 bg-error/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <FlashSaleBadge discountLabel={selected.flashSale.discountLabel} />
            <span className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-error">
                {formatFromRon(selected.flashSale.salePrice, currency)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatFromRon(selected.price, currency)}
              </span>
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            Prețul revine la normal în{" "}
            <CountdownTimer endsAt={selected.flashSale.endsAt} size="sm" />
          </p>
        </div>
      )}

      {selected && !selected.inStock && (
        <div className="space-y-3">
          <RestockNotify variantId={selected.id} sizeML={selected.sizeML} />
          <PushNotificationButton className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-widest text-cream transition-colors hover:border-gold disabled:opacity-50" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canBuy || addToCart.isPending}
          className={cn(
            "relative flex h-14 flex-1 items-center justify-center gap-2 text-sm font-medium uppercase tracking-widest transition-colors",
            canBuy
              ? "bg-gold text-background hover:bg-gold-light"
              : "cursor-not-allowed bg-surface2 text-muted-foreground",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {addToCart.isPending ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="size-5 animate-spin" />
              </motion.span>
            ) : justAdded ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Check className="size-5" /> Adăugat
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <ShoppingBag className="size-5" />
                {canBuy ? "Adaugă în coș" : "Indisponibil"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist.mutate({ perfumeId, wishlisted })}
          disabled={toggleWishlist.isPending}
          aria-label={wishlisted ? "Elimină din favorite" : "Adaugă la favorite"}
          aria-pressed={wishlisted}
          className="flex size-14 items-center justify-center border border-border transition-colors hover:border-gold"
        >
          <Heart
            className={cn(
              "size-5 transition-all",
              wishlisted ? "fill-gold text-gold" : "text-cream",
            )}
          />
        </button>
      </div>

      {selected && (
        <PointsEarnPreview
          amount={selected.flashSale?.salePrice ?? selected.price}
        />
      )}

      <div className="border-t border-border pt-6">
        <TrustBadges />
      </div>
    </div>
  );
}
