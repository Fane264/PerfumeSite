import { z } from "zod";

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export const flashSaleProductSchema = z.object({
  variantId: z.string().min(1),
  salePrice: z.number().positive(),
  stockLimit: z.number().int().positive().nullable().optional(),
});

export const createFlashSaleSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.number().positive(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    bannerColor: z
      .string()
      .regex(HEX_COLOR, "Culoare invalidă (ex. #C9A84C)")
      .default("#C9A84C"),
    isActive: z.boolean().default(true),
    products: z.array(flashSaleProductSchema).min(1, "Adaugă cel puțin un produs"),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "Data de final trebuie să fie după cea de început",
    path: ["endsAt"],
  });

export const updateFlashSaleSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  discountValue: z.number().positive().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  bannerColor: z.string().regex(HEX_COLOR).optional(),
  isActive: z.boolean().optional(),
  // When supplied, replaces the sale's product set wholesale.
  products: z.array(flashSaleProductSchema).optional(),
});

export type CreateFlashSaleInput = z.infer<typeof createFlashSaleSchema>;
export type UpdateFlashSaleInput = z.infer<typeof updateFlashSaleSchema>;
