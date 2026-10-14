import { z } from "zod";
import { CouponType } from "@prisma/client";

export const couponTypeSchema = z.nativeEnum(CouponType);

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Codul trebuie să aibă cel puțin 3 caractere")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Doar litere, cifre, - și _")
      .transform((v) => v.toUpperCase()),
    type: couponTypeSchema,
    value: z.number().positive("Valoarea trebuie să fie pozitivă"),
    minOrderAmount: z.number().nonnegative().nullable().optional(),
    maxUsageCount: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().default(true),
    // ISO date string from the form's <input type="datetime-local">; null clears.
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (data) => data.type !== CouponType.PERCENTAGE || data.value <= 100,
    {
      message: "Procentul nu poate depăși 100",
      path: ["value"],
    },
  );

export const updateCouponSchema = z
  .object({
    isActive: z.boolean().optional(),
    value: z.number().positive().optional(),
    minOrderAmount: z.number().nonnegative().nullable().optional(),
    maxUsageCount: z.number().int().positive().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Nu există câmpuri de actualizat",
  });

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
