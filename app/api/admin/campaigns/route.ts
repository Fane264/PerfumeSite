import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { createCampaignSchema } from "@/lib/validations/campaign";
import { CampaignStatus } from "@prisma/client";
import {
  serializeCampaign,
  getSegmentCounts,
} from "@/lib/campaigns";

export const runtime = "nodejs";

// GET /api/admin/campaigns — all campaigns + per-segment recipient counts.
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const [campaigns, segmentCounts] = await Promise.all([
      db.emailCampaign.findMany({ orderBy: { createdAt: "desc" } }),
      getSegmentCounts(),
    ]);
    return apiSuccess(campaigns.map(serializeCampaign), { segmentCounts });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/campaigns — create a campaign (DRAFT or SCHEDULED).
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const input = createCampaignSchema.parse(await req.json());

    const created = await db.emailCampaign.create({
      data: {
        name: input.name,
        subject: input.subject,
        preheader: input.preheader ?? null,
        htmlContent: input.htmlContent,
        segment: input.segment,
        scheduledAt: input.scheduledAt ?? null,
        status: input.scheduledAt
          ? CampaignStatus.SCHEDULED
          : CampaignStatus.DRAFT,
        createdById: admin.id,
      },
    });

    return apiSuccess(serializeCampaign(created), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
