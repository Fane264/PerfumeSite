import { z } from "zod";
import { CampaignSegment, CampaignStatus } from "@prisma/client";

/** POST /api/admin/campaigns body. */
export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Numele este obligatoriu").max(120),
  subject: z.string().trim().min(1, "Subiectul este obligatoriu").max(200),
  preheader: z.string().trim().max(200).optional(),
  htmlContent: z.string().min(1, "Conținutul este obligatoriu"),
  segment: z.nativeEnum(CampaignSegment),
  scheduledAt: z.coerce.date().optional(),
});

/** PATCH /api/admin/campaigns/[id] body. */
export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    preheader: z.string().trim().max(200).nullable().optional(),
    htmlContent: z.string().min(1).optional(),
    segment: z.nativeEnum(CampaignSegment).optional(),
    status: z.nativeEnum(CampaignStatus).optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Nu există câmpuri de actualizat",
  });

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
