"use client";

import { PerfumeCard } from "@/components/shop/perfume-card";
import { SectionHeading } from "@/components/shop/reveal";
import type { ApiPerfumeListItem } from "@/types";

export function RelatedPerfumes({ perfumes }: { perfumes: ApiPerfumeListItem[] }) {
  if (perfumes.length === 0) return null;

  return (
    <section className="border-t border-border py-16">
      <SectionHeading eyebrow="S-ar putea să-ți placă" title="Parfumuri similare" />
      <div className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4 scrollbar-luxe">
        {perfumes.map((perfume) => (
          <div
            key={perfume.id}
            className="w-64 shrink-0 snap-start sm:w-72"
          >
            <PerfumeCard perfume={perfume} />
          </div>
        ))}
      </div>
    </section>
  );
}
