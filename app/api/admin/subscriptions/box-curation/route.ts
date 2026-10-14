import { NextRequest } from "next/server";
import { BoxStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { boxCurationSchema } from "@/lib/validations/box-curation";
import { sendBoxCurationPreview } from "@/lib/resend";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// GET /api/admin/subscriptions/box-curation?month=YYYY-MM — current curation for
// a month (read back the saved contents + box counts).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const month = req.nextUrl.searchParams.get("month") ?? "";
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return apiError("Lună invalidă (folosește YYYY-MM)", 400);
    }

    const boxes = await db.subscriptionBox.findMany({
      where: { month },
      select: { id: true, status: true, contents: true },
    });

    // Surface the most recent saved contents for the month (boxes share it).
    const withContents = boxes.find((b) => b.contents != null);
    const saved = (withContents?.contents ?? null) as {
      items?: unknown;
      curatorNote?: string;
    } | null;

    return apiSuccess({
      month,
      boxCount: boxes.length,
      contents: Array.isArray(saved?.items) ? saved?.items : [],
      curatorNote: typeof saved?.curatorNote === "string" ? saved.curatorNote : "",
      statusCounts: boxes.reduce<Record<string, number>>((acc, b) => {
        acc[b.status] = (acc[b.status] ?? 0) + 1;
        return acc;
      }, {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/subscriptions/box-curation — set the curated contents for
// all boxes in a month. With `previewEmail`, sends a preview instead of saving.
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const input = boxCurationSchema.parse(await req.json());

    // Preview mode — email ADMIN_EMAIL, no DB writes.
    if (input.previewEmail) {
      if (!env.ADMIN_EMAIL) {
        return apiError("ADMIN_EMAIL nu este configurat", 400);
      }
      await sendBoxCurationPreview(env.ADMIN_EMAIL, {
        month: input.month,
        items: input.contents.map((c) => ({
          perfumeName: c.perfumeName,
          houseName: c.houseName,
          sizeML: c.sizeML,
        })),
        curatorNote: input.curatorNote ?? null,
      });
      return apiSuccess({ previewSent: true, to: env.ADMIN_EMAIL });
    }

    const contents: Prisma.InputJsonValue = {
      items: input.contents,
      curatorNote: input.curatorNote ?? "",
      curatedAt: new Date().toISOString(),
    };

    const result = await db.subscriptionBox.updateMany({
      where: { month: input.month },
      data: {
        contents,
        ...(input.markCurating ? { status: BoxStatus.CURATING } : {}),
      },
    });

    return apiSuccess({
      month: input.month,
      updated: result.count,
      markedCurating: Boolean(input.markCurating),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
