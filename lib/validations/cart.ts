import { z } from "zod";

const MAX_QTY_PER_ITEM = 99;

/** POST /api/cart — add (or increment) an item. */
export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM).default(1),
});

/** POST /api/cart — add every item of a bundle atomically. */
export const addBundleToCartSchema = z.object({
  bundleId: z.string().min(1),
});

export type AddBundleToCartInput = z.infer<typeof addBundleToCartSchema>;

/** PATCH /api/cart — set the quantity of an existing line. */
export const updateCartSchema = z.object({
  cartItemId: z.string().min(1),
  // 0 removes the line entirely.
  quantity: z.number().int().min(0).max(MAX_QTY_PER_ITEM),
});

/** DELETE /api/cart — remove a single line. */
export const removeCartItemSchema = z.object({
  cartItemId: z.string().min(1),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
