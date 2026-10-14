"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

/**
 * Reveal-on-scroll helper. Attach `ref` to an element and use `isInView` to
 * drive an entrance animation; fires once when the element scrolls into view.
 */
export function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  return { ref, isInView };
}
