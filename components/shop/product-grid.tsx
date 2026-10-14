"use client";

import { motion } from "framer-motion";
import { staggerContainer, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PerfumeCard } from "@/components/shop/perfume-card";
import type { ApiPerfumeListItem } from "@/types";

/** Staggered, scroll-revealed grid of product cards. */
export function ProductGrid({
  perfumes,
  className,
  priorityCount = 0,
}: {
  perfumes: ApiPerfumeListItem[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={viewportOnce}
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {perfumes.map((perfume, i) => (
        <PerfumeCard
          key={perfume.id}
          perfume={perfume}
          priority={i < priorityCount}
        />
      ))}
    </motion.div>
  );
}
