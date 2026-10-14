import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { affiliateApplySchema } from "@/lib/validations/affiliate";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { serializeAffiliateDashboard } from "@/lib/affiliate";

export const runtime = "nodejs";

// POST /api/affiliate/apply — submit an affiliate application (status PENDING).
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const input = affiliateApplySchema.parse(await req.json());

    const existing = await db.affiliateAccount.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      throw new ConflictError("Ai deja o aplicație de afiliat");
    }

    const codeTaken = await db.affiliateAccount.findUnique({
      where: { code: input.code },
      select: { id: true },
    });
    if (codeTaken) {
      return apiError("Acest cod este deja folosit. Alege altul.", 409);
    }

    const account = await db.affiliateAccount.create({
      data: {
        userId: user.id,
        code: input.code,
        bio: input.bio ?? null,
        instagramHandle: input.instagramHandle ?? null,
        tiktokHandle: input.tiktokHandle ?? null,
        paypalEmail: input.paypalEmail ?? null,
      },
      include: { conversions: true, payouts: true },
    });

    return apiSuccess(serializeAffiliateDashboard(account), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
