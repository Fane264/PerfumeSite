import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/gift-cards/my — gift cards the current user purchased or received
// (matched on their account email), with current balance and status.
export async function GET() {
  try {
    const user = await requireAuth();

    const cards = await db.giftCard.findMany({
      where: {
        OR: [
          { purchasedByUserId: user.id },
          { recipientEmail: user.email },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const data = cards.map((card) => {
      const purchased = card.purchasedByUserId === user.id;
      const remaining = toNumber(card.remainingValue);
      const expired = card.expiresAt
        ? card.expiresAt.getTime() < Date.now()
        : false;
      return {
        id: card.id,
        // Only reveal the full code to the buyer or the recipient (both qualify
        // here, since the query already scopes to this user).
        code: card.code,
        initialValue: toNumber(card.initialValue),
        remainingValue: remaining,
        currency: card.currency,
        recipientEmail: card.recipientEmail,
        recipientName: card.recipientName,
        relation: purchased ? ("purchased" as const) : ("received" as const),
        isActive: card.isActive,
        isDepleted: remaining <= 0,
        isExpired: expired,
        expiresAt: card.expiresAt ? card.expiresAt.toISOString() : null,
        createdAt: card.createdAt.toISOString(),
      };
    });

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
