import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants";

/** Reusable pagination params parsed from query strings. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/**
 * Query-string boolean. `z.coerce.boolean()` is unusable here because the
 * string "false" coerces to `true`; this only accepts the literal tokens.
 */
export const booleanQueryParam = z
  .union([z.literal("true"), z.literal("false")])
  .transform((value) => value === "true");

/** Identifier (UUID string) used in path/body params. */
export const idSchema = z.string().min(1, "Identificator invalid");

/** Toggle a perfume in/out of the wishlist. */
export const wishlistSchema = z.object({
  perfumeId: idSchema,
});

/** Subscribe an email to a restock alert for a specific variant. */
export const stockNotificationSchema = z.object({
  email: z.string().email("Adresă de email invalidă"),
  variantId: idSchema,
});

/** Flatten `URLSearchParams` into a plain object for schema parsing. */
export function searchParamsToObject(
  searchParams: URLSearchParams,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    result[key] = value;
  }
  return result;
}

export type PaginationInput = z.infer<typeof paginationSchema>;
export type WishlistInput = z.infer<typeof wishlistSchema>;
export type StockNotificationInput = z.infer<typeof stockNotificationSchema>;
