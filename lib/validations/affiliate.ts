import { z } from "zod";
import { AffiliateStatus } from "@prisma/client";

// A personalised affiliate code: AFF- prefix, alphanumeric + dashes.
const affiliateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^AFF-[A-Z0-9-]{3,24}$/,
    "Codul trebuie să înceapă cu AFF- și să conțină litere, cifre sau cratime",
  );

const handleSchema = z
  .string()
  .trim()
  .max(50)
  .optional()
  .transform((v) => (v ? v.replace(/^@/, "") : v));

/** POST /api/affiliate/apply body. */
export const affiliateApplySchema = z.object({
  code: affiliateCodeSchema,
  bio: z.string().trim().max(500).optional(),
  instagramHandle: handleSchema,
  tiktokHandle: handleSchema,
  paypalEmail: z.string().trim().email("Email PayPal invalid").optional(),
});

/** PATCH /api/admin/affiliates/[id] body. */
export const affiliateAdminUpdateSchema = z
  .object({
    status: z.nativeEnum(AffiliateStatus).optional(),
    // Commission rate as a fraction (0–1), e.g. 0.12 for 12%.
    commissionRate: z.coerce.number().min(0).max(1).optional(),
  })
  .refine((d) => d.status !== undefined || d.commissionRate !== undefined, {
    message: "Nu există câmpuri de actualizat",
  });

/** POST /api/admin/affiliates/[id]/payout body. */
export const affiliatePayoutSchema = z.object({
  amount: z.coerce.number().positive("Suma trebuie să fie pozitivă"),
  reference: z.string().trim().max(120).optional(),
  method: z.string().trim().max(40).default("PayPal"),
});

export type AffiliateApplyInput = z.infer<typeof affiliateApplySchema>;
export type AffiliateAdminUpdateInput = z.infer<
  typeof affiliateAdminUpdateSchema
>;
export type AffiliatePayoutInput = z.infer<typeof affiliatePayoutSchema>;
