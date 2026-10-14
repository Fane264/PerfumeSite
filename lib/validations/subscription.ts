import { z } from "zod";

export const boxPreferencesSchema = z.object({
  families: z.array(z.string()).max(20).default([]),
  excludeNotes: z.array(z.string()).max(40).default([]),
  gender: z
    .enum(["MASCULINE", "FEMININE", "UNISEX", "SURPRISE"])
    .default("SURPRISE"),
});

export const subscribeSchema = z.object({
  planId: z.string().min(1),
  preferences: boxPreferencesSchema.optional(),
});

export const updatePreferencesSchema = boxPreferencesSchema;

export const updateBoxSchema = z.object({
  status: z.enum(["PREPARING", "CURATING", "SHIPPED", "DELIVERED"]).optional(),
  trackingNumber: z.string().trim().max(120).nullable().optional(),
  contents: z
    .array(
      z.object({
        perfumeName: z.string(),
        houseName: z.string().optional(),
        sizeML: z.number(),
      }),
    )
    .optional(),
});

export type BoxPreferences = z.infer<typeof boxPreferencesSchema>;
export type UpdateBoxInput = z.infer<typeof updateBoxSchema>;
