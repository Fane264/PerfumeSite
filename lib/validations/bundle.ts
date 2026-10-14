import { z } from "zod";

export const bundleItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

export const createBundleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().min(1).max(1000),
  descriptionEn: z.string().trim().max(1000).optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  items: z.array(bundleItemSchema).min(1, "Adaugă cel puțin un produs"),
});

export const updateBundleSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().min(1).max(1000).optional(),
  descriptionEn: z.string().trim().max(1000).nullable().optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  items: z.array(bundleItemSchema).optional(),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
