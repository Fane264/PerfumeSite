import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Prisma } from "@prisma/client";

/** Merge Tailwind class names, resolving conflicts (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a Prisma `Decimal`, number or numeric string to a plain `number`
 * for use in API DTOs (JSON has no decimal type). Prices/sizes in this store
 * stay well within IEEE-754 safe range.
 */
export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

/** Format a monetary amount for display, e.g. `129,00 RON`. */
export function formatPrice(
  amount: Prisma.Decimal | number | string,
  currency = "RON",
  locale = "ro-RO",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(toNumber(amount));
}

/**
 * Slugify a string: lowercase, strip Romanian diacritics, collapse anything
 * non-alphanumeric into single hyphens.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Generate a short, human-friendly order number, e.g. `DN-7F3A21`. */
export function generateOrderNumber(): string {
  // Web Crypto global — available in Node 20+, edge and browser runtimes.
  const hex = globalThis.crypto.randomUUID().replace(/-/g, "");
  return `DN-${hex.slice(0, 6).toUpperCase()}`;
}

/** Deterministic-ish SKU from a perfume slug + size, e.g. `CREED-AVENTUS-5ML`. */
export function generateSku(perfumeSlug: string, sizeML: number): string {
  return `${perfumeSlug.toUpperCase().replace(/-/g, "")}-${sizeML}ML`;
}

/** Compute available stock (never negative). */
export function availableStock(
  quantity: number,
  reservedQuantity: number,
): number {
  return Math.max(0, quantity - reservedQuantity);
}

/** A Date `minutes` into the future — used for stock-reservation TTLs. */
export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}
