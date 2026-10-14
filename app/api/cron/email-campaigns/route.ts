import { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { sendCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/cron/email-campaigns — dispatch campaigns scheduled to send by now.
// Protected by the `x-cron-secret` header or Vercel Cron's Bearer token.
export async function GET(req: NextRequest) {
  try {
    const provided =
      req.headers.get("x-cron-secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!env.CRON_SECRET || provided !== env.CRON_SECRET) {
      return apiError("Neautorizat", 401);
    }

    const due = await db.emailCampaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, name: true },
    });

    let dispatched = 0;
    const failed: string[] = [];

    for (const campaign of due) {
      // Atomically claim the campaign so a concurrent/duplicate cron run can't
      // send it twice — only the run that flips SCHEDULED→SENDING proceeds.
      const claimed = await db.emailCampaign.updateMany({
        where: { id: campaign.id, status: CampaignStatus.SCHEDULED },
        data: { status: CampaignStatus.SENDING },
      });
      if (claimed.count === 0) continue;

      try {
        await sendCampaign(campaign.id);
        dispatched += 1;
      } catch (err) {
        console.error(
          `[cron/email-campaigns] failed for campaign ${campaign.id}:`,
          err,
        );
        failed.push(campaign.id);
      }
    }

    return apiSuccess({ due: due.length, dispatched, failed });
  } catch (error) {
    return handleApiError(error);
  }
}
