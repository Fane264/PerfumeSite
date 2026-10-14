import { ReferralStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { generateReferralCode } from "@/lib/loyalty";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";

/** Mask an email for display: `ana****@gmail.com`. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}${"*".repeat(4)}@${domain}`;
}

/** Ensure the user has a personal referral code, generating one lazily. */
async function ensureReferralCode(userId: string, existing: string | null) {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      if (attempt === 4) throw new Error("Nu s-a putut genera cod de referral");
    }
  }
  return existing;
}

// GET /api/referral — the member's code, share link, invited friends and
// rewards earned. Auth required.
export async function GET() {
  try {
    const user = await requireAuth();
    const code = await ensureReferralCode(user.id, user.referralCode);

    const [referrals, earnings] = await Promise.all([
      db.referral.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.loyaltyTransaction.aggregate({
        _sum: { points: true },
        where: {
          account: { userId: user.id },
          type: "REFERRAL_SEND",
        },
      }),
    ]);

    const completed = referrals.filter(
      (r) => r.status === ReferralStatus.COMPLETED,
    ).length;

    return apiSuccess({
      code,
      link: `${APP_URL}?ref=${code}`,
      stats: {
        invited: referrals.length,
        completed,
        pointsEarned: earnings._sum.points ?? 0,
      },
      friends: referrals.map((r) => ({
        id: r.id,
        email: maskEmail(r.referredEmail),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
