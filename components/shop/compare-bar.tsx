"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Scale, X } from "lucide-react";
import { useCompareStore, MAX_COMPARE } from "@/store/compare-store";

/** Fixed bottom tray that surfaces the compare selection across the storefront. */
export function CompareBar() {
  const items = useCompareStore((s) => s.items);
  const removeFromCompare = useCompareStore((s) => s.removeFromCompare);
  const clearCompare = useCompareStore((s) => s.clearCompare);

  // Persisted store → only render after mount to avoid hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const show = mounted && items.length > 0;
  const slots = Array.from({ length: MAX_COMPARE });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-border bg-surface/95 backdrop-blur-md"
        >
          <div className="container flex items-center gap-4 py-3.5">
            <div className="hidden items-center gap-2 text-sm uppercase tracking-wide text-gold sm:flex">
              <Scale className="size-4" /> Comparație
            </div>

            <div className="flex flex-1 items-center gap-3 overflow-x-auto scrollbar-luxe">
              {slots.map((_, i) => {
                const item = items[i];
                if (!item) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="hidden size-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-[10px] text-muted-2 sm:flex"
                    >
                      Gol
                    </div>
                  );
                }
                return (
                  <div
                    key={item.id}
                    className="group relative size-12 shrink-0 overflow-hidden rounded-sm border border-border bg-surface2"
                  >
                    {item.primaryImage && (
                      <Image
                        src={item.primaryImage.url}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromCompare(item.id)}
                      aria-label={`Elimină ${item.name}`}
                      className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-4 text-cream" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={clearCompare}
              className="hidden text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-cream sm:block"
            >
              Golește
            </button>

            <Link
              href="/compara"
              className="shrink-0 bg-gold px-5 py-2.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
            >
              Compară ({items.length})
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
