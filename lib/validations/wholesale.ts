import { z } from "zod";

/** POST /api/wholesale/apply — B2B account application. */
export const wholesaleApplySchema = z.object({
  companyName: z.string().min(2, "Numele companiei este obligatoriu").max(160),
  cui: z.string().min(2).max(40).optional(),
  website: z
    .string()
    .url("Adresă web invalidă")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().max(2000).optional(),
});

/** PATCH /api/admin/wholesale/[id] — approve/reject/adjust an account. */
export const wholesaleAdminUpdateSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  // 0..0.9 — rejected above 90% to guard against fat-fingered free orders.
  discountRate: z.number().min(0).max(0.9).optional(),
  creditLimit: z.number().min(0).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export type WholesaleApplyInput = z.infer<typeof wholesaleApplySchema>;
export type WholesaleAdminUpdateInput = z.infer<
  typeof wholesaleAdminUpdateSchema
>;
