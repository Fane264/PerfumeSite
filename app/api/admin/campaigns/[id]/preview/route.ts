import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { sendRawEmail } from "@/lib/resend";
import { renderCampaignHtml } from "@/lib/campaigns";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// GET /api/admin/campaigns/[id]/preview — send a test copy to ADMIN_EMAIL.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const to = env.ADMIN_EMAIL ?? admin.email;

    const campaign = await db.emailCampaign.findUnique({
      where: { id: params.id },
    });
    if (!campaign) return apiError("Campania nu a fost găsită", 404);

    const html = renderCampaignHtml(campaign.htmlContent, {
      email: to,
      firstName: admin.firstName?.trim() || "admin",
    });

    const result = await sendRawEmail(to, `[PREVIEW] ${campaign.subject}`, html);
    return apiSuccess({ sent: result.sent, to });
  } catch (error) {
    return handleApiError(error);
  }
}
