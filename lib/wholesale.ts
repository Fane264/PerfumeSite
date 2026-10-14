import { Prisma, WholesaleStatus } from "@prisma/client";
import { db } from "./db";

// ----------------------------------------------------------------------------
//  B2B Wholesale pricing (Phase 9).
//
//  Wholesale prices are ALWAYS resolved server-side from the account's
//  discount rate — the client never supplies a price. A discount rate of 0.20
//  means the customer pays 80% of retail.
// ----------------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface WholesalePriceResult {
  isWholesale: boolean;
  discountRate: number;
  /** Discounted unit price, in the variant's currency (RON). */
  price: Prisma.Decimal;
}

/** The active wholesale account for a user, or `null`. */
export async function getActiveWholesaleAccount(userId: string | null | undefined) {
  if (!userId) return null;
  const account = await db.wholesaleAccount.findUnique({
    where: { userId },
  });
  if (!account || account.status !== WholesaleStatus.ACTIVE) return null;
  return account;
}

/**
 * Resolve the wholesale price for a variant for a given user. Returns `null`
 * when the user has no active wholesale account (caller should fall back to the
 * retail / flash-sale price).
 */
export async function getWholesalePrice(
  variantId: string,
  userId: string | null | undefined,
): Promise<WholesalePriceResult | null> {
  const account = await getActiveWholesaleAccount(userId);
  if (!account) return null;

  const variant = await db.decantVariant.findUnique({
    where: { id: variantId },
    select: { price: true },
  });
  if (!variant) return null;

  return applyWholesaleRate(variant.price, account.discountRate);
}

/** Apply a discount rate to a retail price, returning a wholesale result. */
export function applyWholesaleRate(
  retail: Prisma.Decimal,
  discountRate: Prisma.Decimal | number,
): WholesalePriceResult {
  const rate =
    typeof discountRate === "number" ? discountRate : discountRate.toNumber();
  const discounted = round2(retail.toNumber() * (1 - rate));
  return {
    isWholesale: true,
    discountRate: rate,
    price: new Prisma.Decimal(discounted),
  };
}

/**
 * Minimum order quantity for a variant. Wholesale buyers must meet the
 * variant's `wholesaleMinQty`; retail buyers always have a minimum of 1.
 */
export async function getMinimumOrderQuantity(
  variantId: string,
  isWholesale: boolean,
): Promise<number> {
  if (!isWholesale) return 1;
  const variant = await db.decantVariant.findUnique({
    where: { id: variantId },
    select: { wholesaleMinQty: true },
  });
  return Math.max(1, variant?.wholesaleMinQty ?? 1);
}

/** Format a discount rate (0.20) as a percentage label ("20%"). */
export function formatDiscountRate(rate: Prisma.Decimal | number): string {
  const n = typeof rate === "number" ? rate : rate.toNumber();
  return `${Math.round(n * 100)}%`;
}
