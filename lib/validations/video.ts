import { z } from "zod";

/** POST /api/admin/products/[slug]/videos — attach a Cloudinary video. */
export const createProductVideoSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().max(160).optional(),
  duration: z.number().int().min(0).max(3600).optional(),
});

/** PATCH — reorder / toggle / retitle videos. */
export const updateProductVideoSchema = z.object({
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  title: z.string().max(160).optional(),
});

/** PATCH /api/admin/products/[slug]/videos — bulk reorder. */
export const reorderProductVideosSchema = z.object({
  order: z.array(z.string().min(1)),
});

export type CreateProductVideoInput = z.infer<typeof createProductVideoSchema>;
export type UpdateProductVideoInput = z.infer<typeof updateProductVideoSchema>;
