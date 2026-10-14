import { NextRequest } from "next/server";
import { Prisma, CampaignStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { updateCampaignSchema } from "@/lib/validations/campaign";
import { serializeCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/campaigns/[id] — edit a campaign / (re)schedule it.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.emailCampaign.findUnique({
      where: { id: params.id },
      select: { status: true },
    });
    if (!existing) return apiError("Campania nu a fost găsită", 404);
    if (
      existing.status === CampaignStatus.SENT ||
      existing.status === CampaignStatus.SENDING
    ) {
      throw new BadRequestError("Campaniile trimise nu mai pot fi editate");
    }

    const input = updateCampaignSchema.parse(await req.json());

    const data: Prisma.EmailCampaignUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.subject !== undefined) data.subject = input.subject;
    if (input.preheader !== undefined) data.preheader = input.preheader;
    if (input.htmlContent !== undefined) data.htmlContent = input.htmlContent;
    if (input.segment !== undefined) data.segment = input.segment;
    if (input.scheduledAt !== undefined) {
      data.scheduledAt = input.scheduledAt;
      if (input.status === undefined) {
        data.status = input.scheduledAt
          ? CampaignStatus.SCHEDULED
          : CampaignStatus.DRAFT;
      }
    }
    if (input.status !== undefined) data.status = input.status;

    const updated = await db.emailCampaign.update({
      where: { id: params.id },
      data,
    });

    return apiSuccess(serializeCampaign(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/campaigns/[id] — remove a draft/scheduled campaign.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const existing = await db.emailCampaign.findUnique({
      where: { id: params.id },
      select: { status: true },
    });
    if (!existing) return apiError("Campania nu a fost găsită", 404);
    if (existing.status === CampaignStatus.SENT) {
      throw new BadRequestError("Campaniile trimise nu pot fi șterse");
    }
    await db.emailCampaign.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
