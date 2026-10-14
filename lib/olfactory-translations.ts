/**
 * Olfactory families are short strings stored with a stable slug but a
 * Romanian `name`. Rather than add EN columns for these few values, we map the
 * slug → { ro, en } here. Slugs follow the project convention (mostly English:
 * "floral", "woody", "fresh", …) but RO aliases are included for safety.
 */
export const FAMILY_TRANSLATIONS: Record<string, { ro: string; en: string }> = {
  // canonical (English) slugs used in the catalog
  floral: { ro: "Florale", en: "Floral" },
  woody: { ro: "Lemnoase", en: "Woody" },
  oriental: { ro: "Orientale", en: "Oriental" },
  fresh: { ro: "Proaspăt", en: "Fresh" },
  citrus: { ro: "Citrice", en: "Citrus" },
  aquatic: { ro: "Acvatice", en: "Aquatic" },
  aromatic: { ro: "Aromatice", en: "Aromatic" },
  chypre: { ro: "Chypre", en: "Chypre" },
  fougere: { ro: "Fougère", en: "Fougère" },
  gourmand: { ro: "Gourmand", en: "Gourmand" },
  powdery: { ro: "Pudrate", en: "Powdery" },
  green: { ro: "Verzi", en: "Green" },
  animalic: { ro: "Animalice", en: "Animalic" },
  // RO aliases (in case any slugs were seeded in Romanian)
  florale: { ro: "Florale", en: "Floral" },
  lemnoase: { ro: "Lemnoase", en: "Woody" },
  orientale: { ro: "Orientale", en: "Oriental" },
  citrice: { ro: "Citrice", en: "Citrus" },
  acvatice: { ro: "Acvatice", en: "Aquatic" },
  aromatice: { ro: "Aromatice", en: "Aromatic" },
  pudrate: { ro: "Pudrate", en: "Powdery" },
  verzi: { ro: "Verzi", en: "Green" },
  animalice: { ro: "Animalice", en: "Animalic" },
};

/**
 * Translate an olfactory family name by slug. Falls back to `fallback`
 * (typically the DB `name`) or the slug itself when no mapping exists.
 */
export function translateFamily(
  slug: string,
  locale: string,
  fallback?: string,
): string {
  const entry = FAMILY_TRANSLATIONS[slug.toLowerCase()];
  if (!entry) return fallback ?? slug;
  return locale === "en" ? entry.en : entry.ro;
}
