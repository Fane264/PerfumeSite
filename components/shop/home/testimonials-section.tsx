"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/shop/reveal";
import { RatingStars } from "@/components/shop/rating-stars";

interface Testimonial {
  rating: number;
  body: string;
  name: string;
  perfume: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    rating: 5,
    body: "Calitatea decanturilor e impecabilă. Aventus miroase exact ca din flaconul original, iar ambalajul e demn de un cadou de lux.",
    name: "Andrei M.",
    perfume: "Creed — Aventus",
  },
  {
    rating: 5,
    body: "Am putut testa cinci parfumuri de nișă la prețul unuia singur. Naxos a devenit semnătura mea olfactivă.",
    name: "Elena R.",
    perfume: "Xerjoff — Naxos",
  },
  {
    rating: 4,
    body: "Livrare rapidă și prezentare rafinată. Recomand oricui vrea să descopere parfumuri rare fără riscul unui flacon întreg.",
    name: "Cristina D.",
    perfume: "Amouage — Reflection",
  },
  {
    rating: 5,
    body: "Serviciu impecabil. Decanturile sunt turnate cu grijă și sigilate perfect. Voi reveni cu siguranță.",
    name: "Vlad P.",
    perfume: "Initio — Oud for Greatness",
  },
];

export function TestimonialsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
  });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    const node = emblaApi.rootNode();
    const stop = () => clearInterval(interval);
    node.addEventListener("mouseenter", stop);
    return () => {
      clearInterval(interval);
      node.removeEventListener("mouseenter", stop);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="bg-surface py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Mărturii"
          title="Ce spun clienții noștri"
          align="center"
        />

        <div className="mt-14 overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="min-w-0 shrink-0 grow-0 basis-full px-3 md:basis-1/2 lg:basis-1/3"
              >
                <figure className="flex h-full flex-col border border-border bg-background p-8">
                  <Quote className="size-7 text-gold/50" />
                  <RatingStars value={t.rating} className="mt-4" />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-cream/90">
                    “{t.body}”
                  </blockquote>
                  <figcaption className="mt-6">
                    <p className="font-serif text-lg text-cream">{t.name}</p>
                    <p className="text-xs uppercase tracking-wide text-gold">
                      {t.perfume}
                    </p>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Mergi la mărturia ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                selected === i ? "w-6 bg-gold" : "w-1.5 bg-muted-2"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
