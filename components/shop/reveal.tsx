"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Reveal children on scroll-into-view using the shared fadeUp preset. */
export function Reveal({
  children,
  className,
  variants = fadeUp,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      whileInView="animate"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container that animates its children into view on scroll. */
export function RevealStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Eyebrow + serif title block used by most homepage sections. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        align === "center" && "mx-auto max-w-2xl text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-xs uppercase tracking-luxe text-gold">{eyebrow}</p>
      )}
      <h2 className="font-serif text-4xl font-light text-cream md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-muted-foreground">{description}</p>
      )}
    </Reveal>
  );
}
