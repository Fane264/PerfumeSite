import { Prisma } from "@prisma/client";
import { db } from "./db";
import { cartArgs, type CartPayload } from "@/types";

type Tx = Prisma.TransactionClient;

/** Ensure the user has a cart row; returns its id. */
export async function getOrCreateCart(userId: string): Promise<string> {
  const cart = await db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  return cart.id;
}

/** Load a user's cart fully populated for serialization. */
export async function loadCart(userId: string): Promise<CartPayload | null> {
  return db.cart.findUnique({ where: { userId }, ...cartArgs });
}

/**
 * Release reservations whose TTL has lapsed, decrementing the corresponding
 * inventory `reservedQuantity`. Scope with a filter (e.g. `{ variantId }` or
 * `{ cartId }`) to keep the sweep cheap. Runs inside the caller's transaction.
 */
export async function reclaimExpiredReservations(
  tx: Tx,
  filter: Prisma.CartItemWhereInput = {},
): Promise<void> {
  const expired = await tx.cartItem.findMany({
    where: { ...filter, reservedUntil: { lt: new Date() } },
    select: { id: true, variantId: true, quantity: true },
  });
  if (expired.length === 0) return;

  for (const item of expired) {
    await tx.inventory.updateMany({
      where: { variantId: item.variantId },
      data: { reservedQuantity: { decrement: item.quantity } },
    });
    await tx.cartItem.update({
      where: { id: item.id },
      data: { reservedUntil: null },
    });
  }

  // Clamp any reservation drift to zero.
  const variantIds = [...new Set(expired.map((e) => e.variantId))];
  await tx.inventory.updateMany({
    where: { variantId: { in: variantIds }, reservedQuantity: { lt: 0 } },
    data: { reservedQuantity: 0 },
  });
}

export interface ReservationMath {
  /** Whether the desired quantity can be honoured. */
  ok: boolean;
  /** The absolute `reservedQuantity` to persist on the inventory row. */
  newReserved: number;
  /** Units available to this line (excludes its own current reservation). */
  available: number;
}

/**
 * Compute the new absolute inventory reservation for a single cart line.
 *
 * `thisLineActiveReserved` is the quantity this line currently holds reserved
 * (0 if its reservation expired), so it is excluded from the availability check
 * and then re-added at the new desired quantity.
 */
export function computeReservation(
  onHand: number,
  reservedQuantity: number,
  thisLineActiveReserved: number,
  desiredQuantity: number,
): ReservationMath {
  const available = onHand - (reservedQuantity - thisLineActiveReserved);
  if (desiredQuantity > available) {
    return { ok: false, newReserved: reservedQuantity, available };
  }
  return {
    ok: true,
    newReserved: reservedQuantity - thisLineActiveReserved + desiredQuantity,
    available,
  };
}

/** Quantity a cart line currently holds reserved (0 once its TTL lapses). */
export function activeReservedFor(item: {
  quantity: number;
  reservedUntil: Date | null;
}): number {
  if (item.reservedUntil && item.reservedUntil.getTime() > Date.now()) {
    return item.quantity;
  }
  return 0;
}
