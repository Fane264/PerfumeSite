"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "ro", label: "RO", flag: "🇷🇴", aria: "Română" },
  { code: "en", label: "EN", flag: "🇬🇧", aria: "English" },
] as const;

/**
 * RO / EN language toggle. With Phase 9's URL-based routing the locale lives in
 * the path, so switching means navigating: `usePathname()` from `@/i18n/navigation`
 * returns the path WITHOUT the locale prefix, and `<Link locale=…>` re-prefixes
 * it (`/parfumuri` for RO, `/en/parfumuri` for EN) per `localePrefix: 'as-needed'`.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      className={cn("flex items-center gap-0.5 text-xs", className)}
      role="group"
      aria-label="Selectează limba"
    >
      {LOCALES.map((l) => (
        <Link
          key={l.code}
          href={pathname}
          locale={l.code}
          aria-current={locale === l.code ? "true" : undefined}
          aria-label={l.aria}
          className={cn(
            "rounded px-1.5 py-1 uppercase tracking-wide transition-colors",
            locale === l.code ? "text-gold" : "text-cream/60 hover:text-gold",
          )}
        >
          <span aria-hidden="true">{l.flag}</span> {l.label}
        </Link>
      ))}
    </div>
  );
}
