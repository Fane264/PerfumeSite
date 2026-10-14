import { z } from "zod";
import { paginationSchema, booleanQueryParam } from "./common";

/** POST /api/reviews body. */
export const createReviewSchema = z.object({
  perfumeId: z.string().min(1),
  rating: z.number().int().min(1, "Minim 1 stea").max(5, "Maxim 5 stele"),
  title: z.string().min(1, "Titlul este obligatoriu").max(140),
  body: z.string().min(1, "Recenzia este obligatorie").max(5000),
  // Up to 3 already-uploaded Cloudinary image URLs (UGC, Phase 8).
  images: z.array(z.string().url()).max(3).optional(),
  // Optional Cloudinary video review URL (max 1, Phase 9).
  videoUrl: z.string().url().optional(),
});

/**
 * GET /api/reviews query. `perfumeId` selects product reviews; `hasImages`
 * (without `perfumeId`) selects the homepage UGC gallery.
 */
export const reviewQuerySchema = z
  .object({
    perfumeId: z.string().min(1).optional(),
    hasImages: booleanQueryParam.optional(),
  })
  .merge(paginationSchema);

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
