"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Heart, ArrowUpRight, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatFromRon } from "@/lib/currency";
import { useCurrencyStore } from "@/store/currency-store";
import { fadeUp } from "@/lib/motion";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { useWishlist, useToggleWishlist } from "@/hooks/use-wishlist";
import { useCompareStore } from "@/store/compare-store";
import { RatingStars } from "@/components/shop/rating-stars";
import { AvailabilityBadge, availabilityFrom } from "@/components/shop/availability-badge";
import { FamilyBadge } from "@/components/shop/family-badge";
import { FlashSaleBadge } from "@/components/shop/FlashSaleBadge";
import { ComingSoonBadge } from "@/components/shop/ComingSoonBadge";
import type { ApiPerfumeListItem } from "@/types";

interface ProductCardProps {
  perfume: ApiPerfumeListItem;
  priority?: boolean;
  /** When provided, the heart removes the item and calls back (wishlist view). */
  className?: string;
}

/**
 * Reusable product card — sharp corners, gold-on-dark typography, hover image
 * zoom, wishlist toggle and a quick "view" affordance. Used across the storefront.
 */
export function PerfumeCard({ perfume, priority, className }: ProductCardProps) {
  const t = useTranslations("product");
  const { wishlistedIds } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const wishlisted = wishlistedIds.has(perfume.id);

  const toggleCompare = useCompareStore((s) => s.toggleCompare);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const storeCurrency = useCurrencyStore((s) => s.currency);
  // Avoid hydration mismatch: persisted state is only read post-mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const inCompare = mounted && isInCompare(perfume.id);
  // Prices are stored in RON; convert to the chosen display currency.
  const currency = mounted ? storeCurrency : "RON";

  const { priceRange } = perfume;
  const priceLabel =
    priceRange.min === priceRange.max
      ? formatFromRon(priceRange.min, currency)
      : t("fromPrice", { price: formatFromRon(priceRange.min, currency) });

  return (
    <motion.article
      variants={fadeUp}
      className={cn("group relative flex flex-col", className)}
    >
      <Link
        href={`/parfumuri/${perfume.slug}`}
        className="relative block aspect-[3/4] overflow-hidden bg-surface"
        aria-label={perfume.name}
      >
        {perfume.primaryImage ? (
          <Image
            src={perfume.primaryImage.url}
            alt={perfume.primaryImage.altText ?? perfume.name}
            fill
            priority={priority}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-serif text-sm text-muted-2">
            {t("noImage")}
          </div>
        )}

        {/* Bottom gradient for legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />

        {/* Availability + flash sale — top-left */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          {perfume.isComingSoon ? (
            <ComingSoonBadge />
          ) : (
            <>
              {perfume.flashSale && (
                <FlashSaleBadge discountLabel={perfume.flashSale.discountLabel} />
              )}
              <AvailabilityBadge state={availabilityFrom(perfume.inStock)} />
            </>
          )}
        </div>

        {/* Quick-view — appears on hover, bottom-right */}
        <span className="absolute bottom-3 right-3 flex size-9 translate-y-2 items-center justify-center rounded-full bg-gold text-background opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      </Link>

      {/* Action stack — top-right, outside the link */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            toggleWishlist.mutate({ perfumeId: perfume.id, wishlisted })
          }
          disabled={toggleWishlist.isPending}
          aria-label={
            wishlisted ? t("removeFromFavorites") : t("addToFavorites")
          }
          aria-pressed={wishlisted}
          className="flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/90"
        >
          <Heart
            className={cn(
              "size-4 transition-all",
              wishlisted ? "fill-gold text-gold scale-110" : "text-cream",
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => toggleCompare(perfume)}
          aria-label={inCompare ? t("removeFromCompare") : t("addToCompare")}
          aria-pressed={inCompare}
          className={cn(
            "flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-all hover:bg-background/90 lg:opacity-0 lg:group-hover:opacity-100",
            inCompare && "lg:opacity-100",
          )}
        >
          <Scale
            className={cn(
              "size-4 transition-all",
              inCompare ? "text-gold" : "text-cream",
            )}
          />
        </button>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col gap-1.5 pt-4">
        <Link
          href={`/case/${perfume.house.slug}`}
          className="text-xs font-medium uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
        >
          {perfume.house.name}
        </Link>
        <Link href={`/parfumuri/${perfume.slug}`}>
          <h3 className="font-serif text-xl font-light leading-tight text-cream transition-colors group-hover:text-gold-light">
            {perfume.name}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-2">
          <FamilyBadge family={perfume.family} />
          {perfume.rating.count > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RatingStars value={perfume.rating.average} size={12} />
              <span>({perfume.rating.count})</span>
            </span>
          )}
        </div>

        {perfume.flashSale ? (
          <div className="mt-auto flex items-baseline gap-2 pt-3">
            <span className="text-sm font-medium text-error">
              {t("fromPrice", {
                price: formatFromRon(perfume.flashSale.salePrice, currency),
              })}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              {formatFromRon(priceRange.min, currency)}
            </span>
          </div>
        ) : (
          <p className="mt-auto pt-3 text-sm text-muted-foreground">{priceLabel}</p>
        )}
      </div>
    </motion.article>
  );
}
