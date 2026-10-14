import type { LoyaltyTier } from "@prisma/client";

// ----------------------------------------------------------------------------
//  Client-safe loyalty presentation layer. `lib/loyalty.ts` pulls in Prisma/db
//  and must stay server-only, so the visual metadata + pure math the UI needs
//  lives here and can be imported into client components freely.
// ----------------------------------------------------------------------------

export const POINTS_TO_RON = 0.05; // 100 puncte = 5 RON

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

export interface TierMeta {
  label: string;
  /** Badge classes (bg/text/border). */
  badge: string;
  /** Dot / accent text color. */
  accent: string;
  /** Progress-bar fill. */
  bar: string;
}

export const TIER_META: Record<LoyaltyTier, TierMeta> = {
  BRONZE: {
    label: "Bronze",
    badge: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    accent: "text-amber-400",
    bar: "bg-amber-500",
  },
  SILVER: {
    label: "Silver",
    badge: "bg-zinc-800/70 text-zinc-200 border-zinc-600/60",
    accent: "text-zinc-300",
    bar: "bg-zinc-300",
  },
  GOLD: {
    label: "Gold",
    badge: "bg-gold/15 text-gold border-gold/40",
    accent: "text-gold",
    bar: "bg-gold",
  },
  PLATINUM: {
    label: "Platinum",
    badge: "bg-purple-950/60 text-purple-300 border-purple-700/60",
    accent: "text-purple-300",
    bar: "bg-purple-400",
  },
};

export const TIER_ORDER: LoyaltyTier[] = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
];

/** RON value of a points balance. */
export function pointsToRon(points: number): number {
  return Math.round(points * POINTS_TO_RON * 100) / 100;
}

/** Estimated points earned for an RON amount at a given tier (default BRONZE). */
export function estimatePoints(amount: number, tier: LoyaltyTier = "BRONZE"): number {
  return Math.floor(amount * TIER_MULTIPLIERS[tier]);
}

/** Human label + sign styling for a ledger entry type. */
export const LOYALTY_EVENT_LABEL: Record<string, string> = {
  PURCHASE: "Achiziție",
  REVIEW: "Recenzie",
  REFERRAL_SEND: "Recomandare",
  REFERRAL_RECEIVE: "Invitație",
  BIRTHDAY: "Zi de naștere",
  REDEMPTION: "Răscumpărare",
  EXPIRY: "Expirare",
  MANUAL_ADJUST: "Ajustare",
};
