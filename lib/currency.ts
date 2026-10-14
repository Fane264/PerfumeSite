// ----------------------------------------------------------------------------
//  Multi-currency support (Phase 7).
//
//  The store is priced in RON in the database. EUR is offered as a display +
//  checkout currency, converted at a manually-maintained rate. The rate is
//  snapshotted onto each order at checkout (see `Order.exchangeRate`) so a later
//  rate change never rewrites historical totals.
//
//  Framework-agnostic: safe to import from both client and server components.
// ----------------------------------------------------------------------------

export const SUPPORTED_CURRENCIES = ["RON", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_DISPLAY_CURRENCY: Currency = "RON";

/** Manually-maintained EUR→RON rate. One EUR is worth this many RON. */
export const EUR_TO_RON_RATE = 4.97;

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/**
 * The number of RON one unit of `currency` is worth — i.e. the multiplier to go
 * from `currency` amounts to RON. RON→1, EUR→EUR_TO_RON_RATE.
 */
export function ronPerUnit(currency: Currency): number {
  return currency === "EUR" ? EUR_TO_RON_RATE : 1;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Convert an amount between supported currencies (via RON as the pivot). */
export function convertPrice(
  amount: number,
  from: Currency,
  to: Currency,
): number {
  if (from === to) return round2(amount);
  const inRon = amount * ronPerUnit(from);
  return round2(inRon / ronPerUnit(to));
}

/** Format an amount already expressed in `currency`. */
export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "EUR" ? "de-DE" : "ro-RO", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Convert a RON-denominated amount into `currency` and format it for display.
 * The common path for product/cart prices, which are stored in RON.
 */
export function formatFromRon(amountRon: number, currency: Currency): string {
  return formatPrice(convertPrice(amountRon, "RON", currency), currency);
}
