import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { sendRestockNotification } from "@/lib/resend";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

type RouteContext = { params: { perfumeId: string } };

// POST /api/admin/waitlist/[perfumeId]/notify — email everyone on a perfume's
// waitlist that it's now available, then stamp `notifiedAt` so they aren't
// emailed again. Admin only.
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const perfume = await db.perfume.findUnique({
      where: { id: params.perfumeId },
      select: {
        id: true,
        name: true,
        slug: true,
        variants: {
          where: { isActive: true },
          orderBy: { sizeML: "asc" },
          select: { sizeML: true },
          take: 1,
        },
      },
    });
    if (!perfume) return apiError("Parfumul nu a fost găsit", 404);

    const entries = await db.waitlistEntry.findMany({
      where: { perfumeId: perfume.id, notifiedAt: null },
      select: { id: true, email: true },
    });

    const productUrl = `${APP_URL}/parfumuri/${perfume.slug}`;
    const sizeML = perfume.variants[0]?.sizeML.toNumber() ?? 0;

    let sent = 0;
    for (const entry of entries) {
      try {
        const result = await sendRestockNotification(entry.email, {
          perfumeName: perfume.name,
          sizeML,
          productUrl,
        });
        if (result.sent) sent += 1;
      } catch (err) {
        console.error(`[Waitlist notify] failed for ${entry.email}:`, err);
      }
    }

    await db.waitlistEntry.updateMany({
      where: { perfumeId: perfume.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });

    return apiSuccess({ notified: entries.length, emailsSent: sent });
  } catch (error) {
    return handleApiError(error);
  }
}
