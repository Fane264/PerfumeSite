import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { waitlistSchema } from "@/lib/validations/waitlist";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { sendWaitlistConfirmation } from "@/lib/resend";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

// POST /api/waitlist — join the waitlist for an upcoming launch. Public; an
// account is optional. Body: { perfumeId, email, firstName? }
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const input = waitlistSchema.parse(await req.json());

    const perfume = await db.perfume.findUnique({
      where: { id: input.perfumeId },
      select: { id: true, name: true, slug: true, waitlistOpen: true },
    });
    if (!perfume) return apiError("Parfumul nu a fost găsit", 404);
    if (!perfume.waitlistOpen) {
      return apiError("Lista de așteptare nu este deschisă pentru acest parfum", 409);
    }

    const user = await getCurrentUser();
    const email = input.email.toLowerCase().trim();

    const existing = await db.waitlistEntry.findUnique({
      where: { perfumeId_email: { perfumeId: perfume.id, email } },
      select: { id: true },
    });

    await db.waitlistEntry.upsert({
      where: { perfumeId_email: { perfumeId: perfume.id, email } },
      create: {
        perfumeId: perfume.id,
        email,
        firstName: input.firstName ?? user?.firstName ?? null,
        userId: user?.id ?? null,
      },
      update: {
        // Re-joining after a previous notification re-arms the alert.
        firstName: input.firstName ?? user?.firstName ?? null,
        ...(user?.id ? { userId: user.id } : {}),
      },
    });

    if (!existing) {
      try {
        await sendWaitlistConfirmation(email, {
          perfumeName: perfume.name,
          firstName: input.firstName ?? user?.firstName ?? null,
          productUrl: `${APP_URL}/parfumuri/${perfume.slug}`,
        });
      } catch (err) {
        console.error("[Waitlist] confirmation email failed:", err);
      }
    }

    return apiSuccess(
      {
        joined: true,
        alreadyJoined: Boolean(existing),
        message: existing
          ? "Ești deja pe lista de așteptare — te anunțăm la lansare."
          : "✓ Ești pe listă! Te anunțăm la lansare.",
      },
      undefined,
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
