import { LoyaltyEventType, ReferralStatus } from "@prisma/client";
import { db } from "./db";
import {
  awardPoints,
  getOrCreateLoyaltyAccount,
  ronToPoints,
  REFERRAL_SENDER_BONUS,
} from "./loyalty";

// ----------------------------------------------------------------------------
//  Loyalty + referral side-effects of a confirmed purchase. Shared by the
//  Stripe webhook (card orders) and the COD checkout path. Best-effort: a
//  failure here never rolls back the order, which is already persisted.
// ----------------------------------------------------------------------------

/**
 * Award purchase loyalty points (scaled by tier) and complete any pending
 * referral on the buyer's first order. `totalRon` must be the order total
 * expressed in RON so points scale consistently across currencies.
 */
export async function awardPurchaseRewards(
  userId: string,
  orderId: string,
  totalRon: number,
): Promise<void> {
  try {
    const account = await getOrCreateLoyaltyAccount(userId);
    const points = ronToPoints(totalRon, account.tier);
    if (points > 0) {
      await awardPoints(userId, points, LoyaltyEventType.PURCHASE, {
        description: `Puncte pentru comanda în valoare de ${totalRon.toFixed(2)} RON`,
        orderId,
      });
    }
  } catch (err) {
    console.error("[order-rewards] purchase points failed:", err);
  }

  try {
    const referral = await db.referral.findFirst({
      where: {
        referredUserId: userId,
        status: { in: [ReferralStatus.PENDING, ReferralStatus.REGISTERED] },
        rewardGrantedAt: null,
      },
    });
    if (referral) {
      await db.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.COMPLETED, rewardGrantedAt: new Date() },
      });
      await awardPoints(
        referral.referrerId,
        REFERRAL_SENDER_BONUS,
        LoyaltyEventType.REFERRAL_SEND,
        {
          description: "Bonus — un prieten invitat a făcut prima comandă",
          referralId: referral.id,
        },
      );
    }
  } catch (err) {
    console.error("[order-rewards] referral completion failed:", err);
  }
}
