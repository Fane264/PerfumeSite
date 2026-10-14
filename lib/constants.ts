// Application-wide business constants. Values that an operator may want to tune
// without a redeploy are read from env with sane fallbacks.

/** Default store currency. */
export const DEFAULT_CURRENCY = "RON";

/** Orders at or above this subtotal (in RON) ship for free. */
export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? "200",
);

/** Flat shipping fee (in RON) applied below the free-shipping threshold. */
export const SHIPPING_FEE = Number(
  process.env.NEXT_PUBLIC_SHIPPING_FEE ?? "15",
);

/** How long a cart item holds its stock reservation, in minutes. */
export const RESERVATION_TTL_MINUTES = 15;

/** Flat fee (in RON) for premium gift wrapping, added as a checkout line item. */
export const GIFT_WRAP_FEE = 15;

/**
 * Cash-on-delivery orders at or below this total (in RON) auto-decrement stock
 * on placement; larger orders hold stock until an admin confirms, to limit the
 * exposure of fraudulent high-value ramburs orders that are never collected.
 */
export const COD_AUTO_CONFIRM_THRESHOLD = Number(
  process.env.COD_AUTO_CONFIRM_THRESHOLD ?? "500",
);

/** Valid decant sizes offered by the store, in millilitres. */
export const DECANT_SIZES_ML = [2, 5, 10, 30] as const;

/** Pagination defaults and guard rails. */
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/** Cloudinary folder where product imagery is stored. */
export const CLOUDINARY_PRODUCTS_FOLDER = "perfume-site/products";

/** Canonical, absolute base URL of the storefront. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Statutory return window (days from delivery) — OG 34/2014. */
export const RETURN_WINDOW_DAYS = 14;

/**
 * Warehouse address shown to customers in return-approval emails. Operator can
 * override via env without a redeploy.
 */
export const RETURN_WAREHOUSE_ADDRESS =
  process.env.RETURN_WAREHOUSE_ADDRESS ??
  "DecantLux — Depozit Retururi, Str. Parfumului nr. 1, Sector 1, 010101 București, România";
