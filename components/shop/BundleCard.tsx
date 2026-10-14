"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { Button } from "@/components/ui/button";
import { useAddBundleToCart } from "@/hooks/use-cart";
import type { BundleDto } from "@/lib/api-client";

interface BundleCardProps {
  bundle: BundleDto;
  onDetails: (bundle: BundleDto) => void;
}

/** Card for a discovery set: overlapping decant thumbnails + savings badge. */
export function BundleCard({ bundle, onDetails }: BundleCardProps) {
  const addBundle = useAddBundleToCart();
  const t = useTranslations("sets");
  const thumbs = bundle.items.slice(0, 4);

  return (
    <motion.article
      variants={fadeUp}
      className="group relative flex flex-col border border-border bg-surface p-6"
    >
      {bundle.savings > 0 && (
        <span className="absolute right-4 top-4 z-10 rounded-sm bg-emerald-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          {t("save", { amount: formatPrice(bundle.savings, bundle.currency) })}
        </span>
      )}

      {/* Overlapping thumbnails */}
      <div className="flex items-center">
        {thumbs.map((item, i) => (
          <div
            key={item.variantId}
            className={cn(
              "relative size-20 overflow-hidden rounded-full border-2 border-surface ring-1 ring-border",
              i > 0 && "-ml-6",
            )}
            style={{ zIndex: thumbs.length - i }}
          >
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.perfumeName}
                fill
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-surface2 text-[10px] text-muted-2">
                {item.sizeML}ml
              </div>
            )}
          </div>
        ))}
        {bundle.items.length > 4 && (
          <span className="-ml-4 flex size-20 items-center justify-center rounded-full border-2 border-surface bg-surface2 text-sm text-cream ring-1 ring-border">
            +{bundle.items.length - 4}
          </span>
        )}
      </div>

      <h3 className="mt-5 font-serif text-xl font-light text-cream">
        {bundle.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {bundle.description}
      </p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-serif text-2xl text-gold">
          {formatPrice(bundle.price, bundle.currency)}
        </span>
        {bundle.savings > 0 && (
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(bundle.individualTotal, bundle.currency)}
          </span>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onDetails(bundle)}>
          {t("details")}
        </Button>
        <Button
          variant="gold"
          className="flex-1"
          disabled={addBundle.isPending}
          onClick={() => addBundle.mutate(bundle.id)}
        >
          {t("addToCart")}
        </Button>
      </div>
    </motion.article>
  );
}
