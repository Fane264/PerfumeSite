import { z } from "zod";

/** A single curated decant inside a subscription box. */
export const boxContentItemSchema = z.object({
  variantId: z.string().min(1),
  sizeML: z.number().positive(),
  perfumeName: z.string().min(1),
  houseName: z.string().min(1),
});

/** PATCH /api/admin/subscriptions/box-curation. */
export const boxCurationSchema = z.object({
  // "2026-07"
  month: z.string().regex(/^\d{4}-\d{2}$/, "Lună invalidă (folosește YYYY-MM)"),
  contents: z.array(boxContentItemSchema).max(20),
  curatorNote: z.string().max(2000).optional(),
  /** When true, transition all matched boxes to CURATING. */
  markCurating: z.boolean().optional(),
  /** When true, send a preview email to ADMIN_EMAIL instead of saving. */
  previewEmail: z.boolean().optional(),
});

export type BoxContentItem = z.infer<typeof boxContentItemSchema>;
export type BoxCurationInput = z.infer<typeof boxCurationSchema>;
