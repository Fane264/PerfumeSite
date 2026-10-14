import type { Variants, Transition } from "framer-motion";

/**
 * Shared Framer Motion presets. Easing is a refined cubic-bezier (no bouncy
 * springs) to keep motion elegant rather than playful.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

export const staggerFast: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
};

/** Standard viewport trigger for scroll-reveal sections. */
export const viewportOnce = { once: true, margin: "-80px" } as const;

/** Quick hover/tap transition for interactive elements. */
export const quickTransition: Transition = { duration: 0.2, ease: EASE };

export const drawerTransition: Transition = { duration: 0.4, ease: EASE };
