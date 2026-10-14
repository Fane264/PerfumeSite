import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { enforceRateLimit, ratelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const validateSchema = z.object({
  code: z.string().trim().min(1).max(32),
});

// POST /api/referral/validate — public. Confirms a referral code resolves to a
// real referrer and returns their first name for the invite banner.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(ratelimit, req);
    if (limited) return limited;

    const { code } = validateSchema.parse(await req.json());

    const referrer = await db.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { firstName: true, deletedAt: true },
    });

    if (!referrer || referrer.deletedAt) {
      return apiSuccess({ valid: false, referrerName: null });
    }

    return apiSuccess({
      valid: true,
      referrerName: referrer.firstName ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
