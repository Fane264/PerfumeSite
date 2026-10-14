import { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { sendCampaign, serializeCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// POST /api/admin/campaigns/[id]/send — send the campaign immediately.
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const campaign = await db.emailCampaign.findUnique({
      where: { id: params.id },
      select: { status: true },
    });
    if (!campaign) return apiError("Campania nu a fost găsită", 404);
    if (
      campaign.status === CampaignStatus.SENT ||
      campaign.status === CampaignStatus.SENDING
    ) {
      throw new BadRequestError("Campania a fost deja trimisă");
    }

    await sendCampaign(params.id);

    const updated = await db.emailCampaign.findUniqueOrThrow({
      where: { id: params.id },
    });
    return apiSuccess(serializeCampaign(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
