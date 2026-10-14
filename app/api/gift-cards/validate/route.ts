import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { giftCardValidateSchema } from "@/lib/validations/gift-card";
import { validateGiftCard } from "@/lib/gift-cards";
import { enforceRateLimit, ratelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/gift-cards/validate — public check of a gift card against a cart
// subtotal. Returns the remaining balance and the amount that can be applied.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(ratelimit, req);
    if (limited) return limited;

    const { code, cartSubtotal } = giftCardValidateSchema.parse(
      await req.json(),
    );
    const result = await validateGiftCard(code, cartSubtotal);

    return apiSuccess({
      valid: true,
      code: result.card.code,
      currency: result.card.currency,
      remainingValue: result.remainingValue,
      maxRedeemable: result.maxRedeemable,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
