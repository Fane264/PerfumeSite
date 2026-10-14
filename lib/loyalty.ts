import {
  CouponType,
  LoyaltyEventType,
  LoyaltyTier,
  Prisma,
  type LoyaltyAccount,
} from "@prisma/client";
import { db } from "./db";
import { BadRequestError } from "./errors";

// ----------------------------------------------------------------------------
//  Loyalty economics — single source of truth for points <-> RON, tiers and
//  the bonuses awarded across the engagement surface.
// ----------------------------------------------------------------------------

export const POINTS_PER_RON = 1;
export const REVIEW_BONUS = 50;
export const REFERRAL_SENDER_BONUS = 100;
export const REFERRAL_RECEIVER_BONUS = 50;
export const BIRTHDAY_BONUS = 200;
export const POINTS_TO_RON = 0.05; // 100 puncte = 5 RON
export const POINTS_EXPIRY_MONTHS = 12;

export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
};

export const TIER_MULTIPLIERS: Record<LoyaltyTier, number> = {
  BRONZE: 1.0,
  SILVER: 1.25,
  GOLD: 1.5,
  PLATINUM: 2.0,
};

export const TIER_FREE_SHIPPING: Record<LoyaltyTier, number> = {
  BRONZE: 200,
  SILVER: 150,
  GOLD: 100,
  PLATINUM: 0,
};

/** Tiers in ascending order — used to compute the "next" tier. */
const TIER_ORDER: LoyaltyTier[] = [
  LoyaltyTier.BRONZE,
  LoyaltyTier.SILVER,
  LoyaltyTier.GOLD,
  LoyaltyTier.PLATINUM,
];

export interface PointsBalance {
  available: number;
  lifetime: number;
  tier: LoyaltyTier;
  /** Points still required to reach the next tier (0 once at PLATINUM). */
  nextTierPoints: number;
  /** Next tier name, or null at the top tier. */
  nextTier: LoyaltyTier | null;
  expiringThisMonth: number;
}

/** Convert a points balance to its RON discount value. */
export function pointsToRon(points: number): number {
  return Math.round(points * POINTS_TO_RON * 100) / 100;
}

/** Points earned per RON spent, scaled by the member's tier multiplier. */
export function ronToPoints(amount: number, tier: LoyaltyTier): number {
  return Math.floor(amount * POINTS_PER_RON * TIER_MULTIPLIERS[tier]);
}

/** The tier a member qualifies for given their lifetime points. */
export function tierForLifetimePoints(lifetimePoints: number): LoyaltyTier {
  let tier: LoyaltyTier = LoyaltyTier.BRONZE;
  for (const t of TIER_ORDER) {
    if (lifetimePoints >= TIER_THRESHOLDS[t]) tier = t;
  }
  return tier;
}

/** The tier above `tier`, or null if already at the top. */
export function nextTierOf(tier: LoyaltyTier): LoyaltyTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 && idx < TIER_ORDER.length - 1
    ? (TIER_ORDER[idx + 1] ?? null)
    : null;
}

/** Ensure the user has a loyalty account, creating one lazily if needed. */
export async function getOrCreateLoyaltyAccount(
  userId: string,
): Promise<LoyaltyAccount> {
  return db.loyaltyAccount.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export interface AwardPointsMeta {
  description: string;
  orderId?: string;
  reviewId?: string;
  referralId?: string;
  /** Override the default 12-month expiry; pass null for non-expiring points. */
  expiresAt?: Date | null;
}

/**
 * Credit (or debit, with a negative `points`) a member's balance and record a
 * ledger entry. Earned points expire `POINTS_EXPIRY_MONTHS` out by default;
 * spent points (negative) never carry an expiry. Recalculates the tier after.
 */
export async function awardPoints(
  userId: string,
  points: number,
  type: LoyaltyEventType,
  meta: AwardPointsMeta,
): Promise<void> {
  if (points === 0) return;

  const account = await getOrCreateLoyaltyAccount(userId);

  const expiresAt =
    meta.expiresAt !== undefined
      ? meta.expiresAt
      : points > 0
        ? monthsFromNow(POINTS_EXPIRY_MONTHS)
        : null;

  await db.$transaction([
    db.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points,
        type,
        description: meta.description,
        orderId: meta.orderId ?? null,
        reviewId: meta.reviewId ?? null,
        referralId: meta.referralId ?? null,
        expiresAt,
      },
    }),
    db.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { increment: points },
        // Lifetime only ever grows with earned (positive) points.
        ...(points > 0 ? { lifetimePoints: { increment: points } } : {}),
      },
    }),
  ]);

  await recalculateTier(userId);
}

/**
 * Spend points for a RON discount. Double-spend safe: the decrement is guarded
 * by a conditional `updateMany` so two concurrent redemptions cannot both
 * succeed. Records a REDEMPTION ledger entry and returns the discount value.
 */
export async function redeemPoints(
  userId: string,
  points: number,
  orderId?: string,
): Promise<{ discountAmount: number }> {
  if (points <= 0 || points % 100 !== 0) {
    throw new BadRequestError("Punctele trebuie să fie un multiplu de 100");
  }

  const account = await getOrCreateLoyaltyAccount(userId);
  if (account.points < points) {
    throw new BadRequestError("Nu ai suficiente puncte pentru această reducere");
  }

  const discountAmount = pointsToRon(points);

  await db.$transaction(async (tx) => {
    // Guarded decrement — only succeeds if the balance still covers it.
    const updated = await tx.loyaltyAccount.updateMany({
      where: { id: account.id, points: { gte: points } },
      data: { points: { decrement: points } },
    });
    if (updated.count === 0) {
      throw new BadRequestError("Punctele nu mai sunt disponibile");
    }
    await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points: -points,
        type: LoyaltyEventType.REDEMPTION,
        description: `Răscumpărare ${points} puncte → ${discountAmount.toFixed(2)} RON reducere`,
        orderId: orderId ?? null,
      },
    });
  });

  return { discountAmount };
}

/** Read the member's full balance snapshot for the account UI. */
export async function getPointsBalance(userId: string): Promise<PointsBalance> {
  const account = await getOrCreateLoyaltyAccount(userId);
  const tier = account.tier;
  const next = nextTierOf(tier);
  const nextTierPoints = next
    ? Math.max(0, TIER_THRESHOLDS[next] - account.lifetimePoints)
    : 0;

  // Sum of positive, unspent points expiring before the end of this month.
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1, 1);
  endOfMonth.setHours(0, 0, 0, 0);

  const expiring = await db.loyaltyTransaction.aggregate({
    _sum: { points: true },
    where: {
      accountId: account.id,
      points: { gt: 0 },
      expiresAt: { not: null, lt: endOfMonth },
    },
  });

  return {
    available: account.points,
    lifetime: account.lifetimePoints,
    tier,
    nextTierPoints,
    nextTier: next,
    expiringThisMonth: Math.min(account.points, expiring._sum.points ?? 0),
  };
}

/** Re-evaluate and persist the member's tier from their lifetime points. */
export async function recalculateTier(userId: string): Promise<LoyaltyTier> {
  const account = await getOrCreateLoyaltyAccount(userId);
  const tier = tierForLifetimePoints(account.lifetimePoints);
  if (tier !== account.tier) {
    await db.loyaltyAccount.update({
      where: { id: account.id },
      data: { tier },
    });
  }
  return tier;
}

/** A Date `months` into the future (used for points expiry). */
function monthsFromNow(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

// ----------------------------------------------------------------------------
//  Short, human-readable codes for referrals and loyalty coupons.
// ----------------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars

/** Random uppercase alphanumeric token of `length` chars (no I/O/0/1). */
export function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET.charAt((bytes[i] ?? 0) % CODE_ALPHABET.length);
  }
  return out;
}

/** A personal referral code, e.g. `REF-X7K2Q9`. */
export function generateReferralCode(): string {
  return `REF-${randomCode(6)}`;
}

/**
 * Create a one-time, fixed-amount loyalty coupon worth `discountAmount` RON.
 * Used by the points-redemption flow. Caller may pass a transaction client.
 */
export async function createLoyaltyCoupon(
  discountAmount: number,
  tx: Prisma.TransactionClient = db,
): Promise<string> {
  const code = `PUNCTE-${randomCode(6)}`;
  await tx.couponCode.create({
    data: {
      code,
      type: CouponType.FIXED_AMOUNT,
      value: new Prisma.Decimal(discountAmount.toFixed(2)),
      maxUsageCount: 1,
      isActive: true,
      // Loyalty coupons are valid for 90 days.
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });
  return code;
}
