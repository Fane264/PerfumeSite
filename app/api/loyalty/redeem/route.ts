import { NextRequest } from "next/server";
import { z } from "zod";
import { LoyaltyEventType, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import {
  createLoyaltyCoupon,
  getOrCreateLoyaltyAccount,
  pointsToRon,
} from "@/lib/loyalty";

export const runtime = "nodejs";

const redeemSchema = z.object({
  points: z
    .number()
    .int()
    .positive()
    .refine((p) => p % 100 === 0, "Punctele trebuie să fie un multiplu de 100"),
});

// POST /api/loyalty/redeem — spend points for a one-time discount coupon. The
// whole operation runs in a single transaction (guarded decrement) so two
// concurrent redemptions can't double-spend the same balance.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const { points } = redeemSchema.parse(await req.json());

    const account = await getOrCreateLoyaltyAccount(user.id);
    if (account.points < points) {
      throw new BadRequestError("Nu ai suficiente puncte pentru această reducere");
    }

    const discountAmount = pointsToRon(points);

    const couponCode = await db.$transaction(async (tx) => {
      const updated = await tx.loyaltyAccount.updateMany({
        where: { id: account.id, points: { gte: points } },
        data: { points: { decrement: points } },
      });
      if (updated.count === 0) {
        throw new BadRequestError("Punctele nu mai sunt disponibile");
      }

      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points: -points,
          type: LoyaltyEventType.REDEMPTION,
          description: `Răscumpărare ${points} puncte → ${discountAmount.toFixed(2)} RON reducere`,
        },
      });

      return createLoyaltyCoupon(discountAmount, tx as Prisma.TransactionClient);
    });

    return apiSuccess({ discountAmount, couponCode, pointsSpent: points });
  } catch (error) {
    return handleApiError(error);
  }
}
