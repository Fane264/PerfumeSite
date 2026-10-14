/**
 * Olfactory-family visual system. The backend stores a `colorHex` per family,
 * but for badges we map well-known family slugs to curated Tailwind classes so
 * the palette stays cohesive across the dark theme. Unknown families fall back
 * to a neutral treatment (and the API `colorHex` can still be used inline).
 */

export const familyColors: Record<string, string> = {
  floral: "bg-pink-950 text-pink-300 border-pink-800",
  oriental: "bg-amber-950 text-amber-300 border-amber-800",
  woody: "bg-stone-800 text-stone-300 border-stone-700",
  fresh: "bg-teal-950 text-teal-300 border-teal-800",
  chypre: "bg-green-950 text-green-300 border-green-800",
  fougere: "bg-indigo-950 text-indigo-300 border-indigo-800",
  gourmand: "bg-rose-950 text-rose-300 border-rose-800",
};

const FALLBACK = "bg-surface2 text-muted-foreground border-border";

/** Tailwind classes for an olfactory-family badge, keyed by slug. */
export function familyBadgeClass(slug: string): string {
  return familyColors[slug] ?? FALLBACK;
}

/** Olfactory families used for the homepage wheel + listing fallbacks. */
export const FAMILY_FALLBACK: { name: string; slug: string }[] = [
  { name: "Floral", slug: "floral" },
  { name: "Oriental", slug: "oriental" },
  { name: "Lemnos", slug: "woody" },
  { name: "Proaspăt", slug: "fresh" },
  { name: "Chypre", slug: "chypre" },
  { name: "Fougère", slug: "fougere" },
  { name: "Gourmand", slug: "gourmand" },
];
