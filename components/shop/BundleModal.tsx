"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { Button } from "@/components/ui/button";
import { useAddBundleToCart } from "@/hooks/use-cart";
import type { BundleDto } from "@/lib/api-client";

/** Detail modal listing every decant in a bundle with the savings breakdown. */
export function BundleModal({
  bundle,
  onClose,
}: {
  bundle: BundleDto | null;
  onClose: () => void;
}) {
  const addBundle = useAddBundleToCart();
  const t = useTranslations("sets");

  return (
    <AnimatePresence>
      {bundle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-surface p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-light text-cream">
                  {bundle.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {bundle.description}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="text-muted-foreground transition-colors hover:text-cream"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="mt-6 divide-y divide-border border-y border-border">
              {bundle.items.map((item) => (
                <li
                  key={item.variantId}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface2">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.perfumeName}
                        fill
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cream">
                      {item.perfumeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.houseName} · {item.sizeML} ml
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(item.unitPrice * item.quantity, bundle.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("individualTotal")}</span>
                <span className="line-through">
                  {formatPrice(bundle.individualTotal, bundle.currency)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>{t("youSave")}</span>
                <span>{formatPrice(bundle.savings, bundle.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base text-cream">
                <span>{t("setPrice")}</span>
                <span className="font-serif text-xl text-gold">
                  {formatPrice(bundle.price, bundle.currency)}
                </span>
              </div>
            </div>

            <Button
              variant="gold"
              className="mt-6 w-full"
              disabled={addBundle.isPending}
              onClick={() =>
                addBundle.mutate(bundle.id, { onSuccess: onClose })
              }
            >
              {addBundle.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("addAllToCart")}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
