"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiImage } from "@/types";

export function ProductGallery({
  images,
  name,
}: {
  images: ApiImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const current = images[active];

  const goNext = () =>
    setActive((i) => (images.length ? (i + 1) % images.length : i));
  const goPrev = () =>
    setActive((i) =>
      images.length ? (i - 1 + images.length) % images.length : i,
    );

  function onPointerDown(e: React.PointerEvent) {
    swipeStartX.current = e.clientX;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (swipeStartX.current === null) return;
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) > 10) {
      // A drag occurred — suppress the click that would open the lightbox.
      suppressClick.current = true;
    }
    if (images.length < 2) return;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-surface font-serif text-muted-2">
        Fără imagine
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setLightbox(true);
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="relative aspect-[4/5] touch-pan-y overflow-hidden bg-surface"
        aria-label="Mărește imaginea"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id ?? active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {current && (
              <Image
                src={current.url}
                alt={current.altText ?? name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-luxe">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Imaginea ${i + 1}`}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden bg-surface transition-opacity",
                i === active
                  ? "ring-1 ring-gold"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={img.url}
                alt={img.altText ?? `${name} ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-6"
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Închide"
              className="absolute right-6 top-6 text-cream/70 transition-colors hover:text-cream"
            >
              <X className="size-7" />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative h-[80vh] w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={current.url}
                alt={current.altText ?? name}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
