import { z } from "zod";

/** POST /api/waitlist — public waitlist signup (email, no account required). */
export const waitlistSchema = z.object({
  perfumeId: z.string().min(1),
  email: z.string().email("Adresă de email invalidă"),
  firstName: z.string().min(1).max(80).optional(),
});

/** POST /api/preorders — authenticated pre-order checkout. */
export const preOrderSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(50).default(1),
});

/** PATCH /api/admin/preorders/[id] — admin status transition. */
export const updatePreOrderSchema = z.object({
  status: z.enum(["FULFILLED", "CANCELLED"]),
});

/** PATCH /api/admin/waitlist/[perfumeId] — toggle launch flags. */
export const launchFlagsSchema = z.object({
  isComingSoon: z.boolean().optional(),
  waitlistOpen: z.boolean().optional(),
  preOrderOpen: z.boolean().optional(),
  launchDate: z.string().datetime().nullable().optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type PreOrderInput = z.infer<typeof preOrderSchema>;
export type UpdatePreOrderInput = z.infer<typeof updatePreOrderSchema>;
