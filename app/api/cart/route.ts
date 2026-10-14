import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  addToCartSchema,
  addBundleToCartSchema,
  updateCartSchema,
  removeCartItemSchema,
} from "@/lib/validations/cart";
import {
  getOrCreateCart,
  loadCart,
  reclaimExpiredReservations,
  computeReservation,
  activeReservedFor,
} from "@/lib/cart";
import { serializeCart } from "@/lib/serializers";
import { enforceRateLimit, ratelimit } from "@/lib/ratelimit";
import { minutesFromNow } from "@/lib/utils";
import { RESERVATION_TTL_MINUTES, DEFAULT_CURRENCY } from "@/lib/constants";
import type { ApiCart } from "@/types";

export const runtime = "nodejs";

const EMPTY_CART: ApiCart = {
  id: "",
  currency: DEFAULT_CURRENCY,
  items: [],
  itemCount: 0,
  subtotal: 0,
};

function reservedUntil() {
  return minutesFromNow(RESERVATION_TTL_MINUTES);
}

async function respondWithCart(userId: string, status = 200) {
  const cart = await loadCart(userId);
  return apiSuccess(cart ? serializeCart(cart) : EMPTY_CART, undefined, status);
}

// ----------------------------------------------------------------------------
//  GET /api/cart — current user's cart (reclaims expired reservations first).
// ----------------------------------------------------------------------------
export async function GET() {
  try {
    const user = await requireAuth();
    const cartId = await getOrCreateCart(user.id);

    await db.$transaction((tx) =>
      reclaimExpiredReservations(tx, { cartId }),
    );

    return respondWithCart(user.id);
  } catch (error) {
    return handleApiError(error);
  }
}

// ----------------------------------------------------------------------------
//  Bundle add — adds every item of a bundle in one transaction. If ANY variant
//  is inactive or out of stock the whole operation rolls back. Each created line
//  is tagged with the bundle id so the cart UI can group them.
// ----------------------------------------------------------------------------
async function addBundleToCart(userId: string, bundleId: string) {
  const cartId = await getOrCreateCart(userId);

  await db.$transaction(async (tx) => {
    const bundle = await tx.bundle.findFirst({
      where: { id: bundleId, isActive: true },
      include: {
        items: { include: { variant: { include: { inventory: true } } } },
      },
    });
    if (!bundle || bundle.items.length === 0) {
      throw new NotFoundError("Setul nu este disponibil");
    }

    const variantIds = bundle.items.map((i) => i.variantId);
    await reclaimExpiredReservations(tx, { variantId: { in: variantIds } });

    for (const item of bundle.items) {
      const variant = item.variant;
      if (!variant.isActive) {
        throw new ConflictError(
          `Un produs din set nu mai este disponibil — comanda nu a fost adăugată`,
        );
      }
      const inventory =
        variant.inventory ??
        (await tx.inventory.create({
          data: { variantId: variant.id, quantity: 0 },
        }));

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId: variant.id } },
      });
      const desired = (existing?.quantity ?? 0) + item.quantity;
      const lineReserved = existing ? activeReservedFor(existing) : 0;

      const math = computeReservation(
        inventory.quantity,
        inventory.reservedQuantity,
        lineReserved,
        desired,
      );
      if (!math.ok) {
        throw new ConflictError(
          `Stoc insuficient pentru un produs din set — comanda nu a fost adăugată`,
        );
      }

      await tx.inventory.update({
        where: { variantId: variant.id },
        data: { reservedQuantity: math.newReserved },
      });
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId: variant.id } },
        create: {
          cartId,
          variantId: variant.id,
          quantity: desired,
          bundleId: bundle.id,
          reservedUntil: reservedUntil(),
        },
        update: {
          quantity: desired,
          bundleId: bundle.id,
          reservedUntil: reservedUntil(),
        },
      });
    }
  });
}

// ----------------------------------------------------------------------------
//  POST /api/cart — add (increment) an item, atomically reserving stock.
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(ratelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const body = await req.json();

    // Bundle add — all-or-nothing across every bundle line.
    if (body && typeof body === "object" && "bundleId" in body) {
      const { bundleId } = addBundleToCartSchema.parse(body);
      await addBundleToCart(user.id, bundleId);
      return respondWithCart(user.id, 201);
    }

    const { variantId, quantity } = addToCartSchema.parse(body);
    const cartId = await getOrCreateCart(user.id);

    await db.$transaction(async (tx) => {
      await reclaimExpiredReservations(tx, { variantId });

      const variant = await tx.decantVariant.findUnique({
        where: { id: variantId },
        include: { inventory: true },
      });
      if (!variant || !variant.isActive) {
        throw new NotFoundError("Varianta selectată nu este disponibilă");
      }
      const inventory =
        variant.inventory ??
        (await tx.inventory.create({ data: { variantId, quantity: 0 } }));

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId } },
      });
      const desired = (existing?.quantity ?? 0) + quantity;
      const lineReserved = existing ? activeReservedFor(existing) : 0;

      const math = computeReservation(
        inventory.quantity,
        inventory.reservedQuantity,
        lineReserved,
        desired,
      );
      if (!math.ok) {
        throw new ConflictError(
          `Stoc insuficient. Disponibil: ${Math.max(0, math.available)}`,
        );
      }

      await tx.inventory.update({
        where: { variantId },
        data: { reservedQuantity: math.newReserved },
      });
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId } },
        create: { cartId, variantId, quantity: desired, reservedUntil: reservedUntil() },
        update: { quantity: desired, reservedUntil: reservedUntil() },
      });
    });

    return respondWithCart(user.id, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// ----------------------------------------------------------------------------
//  PATCH /api/cart — set the quantity of a line (0 removes it).
// ----------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { cartItemId, quantity } = updateCartSchema.parse(await req.json());

    await db.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: cartItemId },
        include: { cart: { select: { userId: true } } },
      });
      if (!item || item.cart.userId !== user.id) {
        throw new NotFoundError("Articolul nu există în coș");
      }

      await reclaimExpiredReservations(tx, { variantId: item.variantId });

      let inventory = await tx.inventory.findUnique({
        where: { variantId: item.variantId },
      });
      inventory ??= await tx.inventory.create({
        data: { variantId: item.variantId, quantity: 0 },
      });

      // Re-read the line: reclaim may have cleared its reservation.
      const fresh = await tx.cartItem.findUnique({ where: { id: cartItemId } });
      if (!fresh) throw new NotFoundError("Articolul nu există în coș");
      const lineReserved = activeReservedFor(fresh);

      if (quantity === 0) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { reservedQuantity: { decrement: lineReserved } },
        });
        await tx.cartItem.delete({ where: { id: cartItemId } });
      } else {
        const math = computeReservation(
          inventory.quantity,
          inventory.reservedQuantity,
          lineReserved,
          quantity,
        );
        if (!math.ok) {
          throw new ConflictError(
            `Stoc insuficient. Disponibil: ${Math.max(0, math.available)}`,
          );
        }
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { reservedQuantity: math.newReserved },
        });
        await tx.cartItem.update({
          where: { id: cartItemId },
          data: { quantity, reservedUntil: reservedUntil() },
        });
      }

      await tx.inventory.updateMany({
        where: { variantId: item.variantId, reservedQuantity: { lt: 0 } },
        data: { reservedQuantity: 0 },
      });
    });

    return respondWithCart(user.id);
  } catch (error) {
    return handleApiError(error);
  }
}

// ----------------------------------------------------------------------------
//  DELETE /api/cart — remove one line, or `?clearAll=true` to empty the cart.
//  Releases the corresponding stock reservations.
// ----------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const clearAll = req.nextUrl.searchParams.get("clearAll") === "true";

    let cartItemId: string | null = null;
    if (!clearAll) {
      const body = await req.json().catch(() => ({}));
      cartItemId = removeCartItemSchema.parse(body).cartItemId;
    }

    await db.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!cart) return;

      if (clearAll) {
        const items = await tx.cartItem.findMany({
          where: { cartId: cart.id },
          select: { id: true, variantId: true, quantity: true, reservedUntil: true },
        });
        for (const item of items) {
          const reserved = activeReservedFor(item);
          if (reserved > 0) {
            await tx.inventory.updateMany({
              where: { variantId: item.variantId },
              data: { reservedQuantity: { decrement: reserved } },
            });
          }
        }
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.inventory.updateMany({
          where: { reservedQuantity: { lt: 0 } },
          data: { reservedQuantity: 0 },
        });
        return;
      }

      const item = await tx.cartItem.findUnique({
        where: { id: cartItemId! },
        include: { cart: { select: { userId: true } } },
      });
      if (!item || item.cart.userId !== user.id) {
        throw new NotFoundError("Articolul nu există în coș");
      }
      const reserved = activeReservedFor(item);
      if (reserved > 0) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: { reservedQuantity: { decrement: reserved } },
        });
      }
      await tx.cartItem.delete({ where: { id: item.id } });
      await tx.inventory.updateMany({
        where: { variantId: item.variantId, reservedQuantity: { lt: 0 } },
        data: { reservedQuantity: 0 },
      });
    });

    return respondWithCart(user.id);
  } catch (error) {
    return handleApiError(error);
  }
}
