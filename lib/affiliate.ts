import type { AffiliateAccount, Prisma } from "@prisma/client";
import { AffiliateStatus, ConversionStatus } from "@prisma/client";
import { db } from "./db";

// ----------------------------------------------------------------------------
//  Affiliate / influencer program (Phase 7).
//
//  A visitor arriving via `?aff=AFF-XXXX` gets an `affiliate_code` cookie. At
//  checkout the code is stamped onto the order; when the purchase is confirmed a
//  conversion is recorded against the (active) affiliate, accruing commission.
// ----------------------------------------------------------------------------

/** Cookie that carries the attributed affiliate code (30-day window). */
export const AFFILIATE_COOKIE = "affiliate_code";
export const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Look up an affiliate by its public code. */
export async function getAffiliateByCode(
  code: string,
): Promise<AffiliateAccount | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  return db.affiliateAccount.findUnique({ where: { code: trimmed } });
}

/** Commission for an order total at the given rate, rounded to 2 decimals. */
export function calculateCommission(orderTotal: number, rate: number): number {
  return round2(orderTotal * rate);
}

/**
 * Record a conversion for an order placed via an affiliate link. Idempotent on
 * `orderId` and a no-op unless the code maps to an ACTIVE affiliate. Best-effort:
 * accrues `totalEarned` and creates a PENDING conversion in one transaction.
 */
export async function recordConversion(
  orderId: string,
  affiliateCode: string,
): Promise<void> {
  const code = affiliateCode.trim();
  if (!code) return;

  const affiliate = await db.affiliateAccount.findUnique({ where: { code } });
  if (!affiliate || affiliate.status !== AffiliateStatus.ACTIVE) return;

  const existing = await db.affiliateConversion.findUnique({
    where: { orderId },
    select: { id: true },
  });
  if (existing) return;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { total: true },
  });
  if (!order) return;

  // Never let an affiliate earn commission on their own purchases.
  const self = await db.order.findFirst({
    where: { id: orderId, userId: affiliate.userId },
    select: { id: true },
  });
  if (self) return;

  const orderTotal = order.total.toNumber();
  const commission = calculateCommission(
    orderTotal,
    affiliate.commissionRate.toNumber(),
  );

  await db.$transaction([
    db.affiliateConversion.create({
      data: {
        affiliateId: affiliate.id,
        orderId,
        orderTotal,
        commission,
        status: ConversionStatus.PENDING,
      },
    }),
    db.affiliateAccount.update({
      where: { id: affiliate.id },
      data: { totalEarned: { increment: commission } },
    }),
  ]);
}

/**
 * Advance an order's conversion to CONFIRMED once the order is delivered, or
 * CANCELLED if the order is cancelled/refunded. Best-effort, idempotent.
 */
export async function updateConversionForOrderStatus(
  orderId: string,
  next: typeof ConversionStatus.CONFIRMED | typeof ConversionStatus.CANCELLED,
): Promise<void> {
  const conversion = await db.affiliateConversion.findUnique({
    where: { orderId },
  });
  if (!conversion) return;
  // Don't disturb an already-paid commission.
  if (conversion.status === ConversionStatus.PAID) return;
  if (conversion.status === next) return;

  await db.affiliateConversion.update({
    where: { orderId },
    data: { status: next },
  });

  // Roll back accrued earnings if the order was cancelled.
  if (next === ConversionStatus.CANCELLED) {
    await db.affiliateAccount.update({
      where: { id: conversion.affiliateId },
      data: { totalEarned: { decrement: conversion.commission } },
    });
  }
}

export type AffiliateConversionRow = {
  id: string;
  orderTotal: number;
  commission: number;
  status: ConversionStatus;
  createdAt: string;
};

export type AffiliatePayoutRow = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
};

export interface AffiliateDashboardData {
  id: string;
  code: string;
  status: AffiliateStatus;
  commissionRate: number;
  paypalEmail: string | null;
  bio: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  totalEarned: number;
  totalPaid: number;
  availableForPayout: number;
  conversionCount: number;
  confirmedCount: number;
  conversions: AffiliateConversionRow[];
  payouts: AffiliatePayoutRow[];
}

type AffiliateWithRelations = Prisma.AffiliateAccountGetPayload<{
  include: { conversions: true; payouts: true };
}>;

export interface AdminAffiliateRow {
  id: string;
  code: string;
  status: AffiliateStatus;
  commissionRate: number;
  paypalEmail: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  bio: string | null;
  totalEarned: number;
  totalPaid: number;
  availableForPayout: number;
  conversionCount: number;
  customerName: string;
  customerEmail: string;
  createdAt: string;
}

type AffiliateAdminPayload = Prisma.AffiliateAccountGetPayload<{
  include: {
    user: { select: { email: true; firstName: true; lastName: true } };
    _count: { select: { conversions: true } };
  };
}>;

/** Shape an affiliate account into the admin list row DTO. */
export function serializeAdminAffiliate(
  account: AffiliateAdminPayload,
): AdminAffiliateRow {
  const totalEarned = account.totalEarned.toNumber();
  const totalPaid = account.totalPaid.toNumber();
  const name =
    `${account.user.firstName ?? ""} ${account.user.lastName ?? ""}`.trim();
  return {
    id: account.id,
    code: account.code,
    status: account.status,
    commissionRate: account.commissionRate.toNumber(),
    paypalEmail: account.paypalEmail,
    instagramHandle: account.instagramHandle,
    tiktokHandle: account.tiktokHandle,
    bio: account.bio,
    totalEarned,
    totalPaid,
    availableForPayout: round2(Math.max(0, totalEarned - totalPaid)),
    conversionCount: account._count.conversions,
    customerName: name || account.user.email,
    customerEmail: account.user.email,
    createdAt: account.createdAt.toISOString(),
  };
}

/** Shape an affiliate account (with relations) into the dashboard DTO. */
export function serializeAffiliateDashboard(
  account: AffiliateWithRelations,
): AffiliateDashboardData {
  const totalEarned = account.totalEarned.toNumber();
  const totalPaid = account.totalPaid.toNumber();
  const conversions = [...account.conversions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return {
    id: account.id,
    code: account.code,
    status: account.status,
    commissionRate: account.commissionRate.toNumber(),
    paypalEmail: account.paypalEmail,
    bio: account.bio,
    instagramHandle: account.instagramHandle,
    tiktokHandle: account.tiktokHandle,
    totalEarned,
    totalPaid,
    availableForPayout: round2(Math.max(0, totalEarned - totalPaid)),
    conversionCount: conversions.length,
    confirmedCount: conversions.filter(
      (c) =>
        c.status === ConversionStatus.CONFIRMED ||
        c.status === ConversionStatus.PAID,
    ).length,
    conversions: conversions.map((c) => ({
      id: c.id,
      orderTotal: c.orderTotal.toNumber(),
      commission: c.commission.toNumber(),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    payouts: [...account.payouts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((p) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        method: p.method,
        reference: p.reference,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),
  };
}
