import { defineRouting } from "next-intl/routing";

export const LOCALES = ["ro", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ro";

/**
 * Locale-prefixed routing (Phase 9). `as-needed` keeps the default locale (RO)
 * unprefixed — `/parfumuri` stays `/parfumuri`, so existing Romanian URLs never
 * 404 — while English is served under `/en` (`/en/parfumuri`).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
});
