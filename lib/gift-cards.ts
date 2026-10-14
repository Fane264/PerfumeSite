import { randomInt } from "node:crypto";
import { Prisma, type GiftCard } from "@prisma/client";
import { db } from "./db";
import { BadRequestError, ConflictError } from "./errors";

// ----------------------------------------------------------------------------
//  Gift card domain logic: code generation, validation and atomic redemption.
// ----------------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

// Unambiguous alphabet (no 0/O/1/I) for human-readable, transcribable codes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBlock(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    // crypto.randomInt is cryptographically secure and unbiased.
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Generate a code in the `GIFT-XXXX-XXXX` format (cryptographically random). */
export function generateGiftCardCode(): string {
  return `GIFT-${randomBlock(4)}-${randomBlock(4)}`;
}

/** Generate a code guaranteed unique against existing rows (retries on clash). */
export async function generateUniqueGiftCardCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateGiftCardCode();
    const existing = await db.giftCard.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Nu am putut genera un cod unic de card cadou");
}

export interface GiftCardValidation {
  valid: boolean;
  card: GiftCard;
  remainingValue: number;
  /** How much of this gift card can be applied to the given amount. */
  maxRedeemable: number;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Validate a gift card against an order amount. Throws `BadRequestError` with a
 * user-facing reason when the card can't be applied.
 */
export async function validateGiftCard(
  code: string,
  amount: number,
): Promise<GiftCardValidation> {
  const card = await db.giftCard.findUnique({
    where: { code: normalizeCode(code) },
  });

  if (!card || !card.isActive) {
    throw new BadRequestError("Cardul cadou nu este valid");
  }
  if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("Cardul cadou a expirat");
  }

  const remainingValue = card.remainingValue.toNumber();
  if (remainingValue <= 0) {
    throw new BadRequestError("Cardul cadou a fost folosit integral");
  }

  const maxRedeemable = round2(Math.min(remainingValue, Math.max(0, amount)));
  return { valid: true, card, remainingValue, maxRedeemable };
}

/**
 * Atomically redeem `amount` from a gift card against an order. Uses a Prisma
 * transaction with a conditional `updateMany` (decrement only while enough
 * balance remains) to prevent double-spend under concurrent checkouts.
 *
 * Must be called inside the order-creation flow with a positive amount.
 */
export async function redeemGiftCard(
  code: string,
  orderId: string,
  amount: number,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const value = round2(amount);
  if (value <= 0) return;

  const run = async (client: Prisma.TransactionClient) => {
    const normalized = normalizeCode(code);
    const card = await client.giftCard.findUnique({
      where: { code: normalized },
      select: { id: true, isActive: true, remainingValue: true, expiresAt: true },
    });
    if (!card || !card.isActive) {
      throw new ConflictError("Cardul cadou nu mai este valid");
    }
    if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
      throw new ConflictError("Cardul cadou a expirat");
    }

    // Conditional decrement: only succeeds if remaining >= value right now.
    const decremented = await client.giftCard.updateMany({
      where: { id: card.id, remainingValue: { gte: value } },
      data: { remainingValue: { decrement: value } },
    });
    if (decremented.count === 0) {
      throw new ConflictError("Sold insuficient pe cardul cadou");
    }

    await client.giftCardRedemption.create({
      data: { giftCardId: card.id, orderId, amount: value },
    });
  };

  if (tx) {
    await run(tx);
  } else {
    await db.$transaction(run);
  }
}
