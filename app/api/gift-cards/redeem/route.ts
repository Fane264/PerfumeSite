import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { giftCardRedeemSchema } from "@/lib/validations/gift-card";
import { redeemGiftCard } from "@/lib/gift-cards";

export const runtime = "nodejs";

// POST /api/gift-cards/redeem — internal redemption endpoint. Customer-facing
// redemption happens automatically in the Stripe webhook when a paid order
// carries a gift card; this admin-guarded route exists for manual adjustments
// and tooling. Redemption is atomic and double-spend safe.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { code, orderId, amount } = giftCardRedeemSchema.parse(
      await req.json(),
    );
    await redeemGiftCard(code, orderId, amount);
    return apiSuccess({ redeemed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
