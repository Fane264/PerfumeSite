import { NextRequest } from "next/server";
import { z } from "zod";
import { CouponType } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { enforceRateLimit, ratelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Introdu un cod de reducere"),
  subtotal: z.number().nonnegative(),
});

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  type: CouponType;
  value: number;
  discountAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// POST /api/coupons/validate — check a coupon against the current subtotal and
// return its computed discount. Does NOT increment usage (that happens on a
// successful payment via the Stripe webhook). Public (no auth required).
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(ratelimit, req);
    if (limited) return limited;

    const { code, subtotal } = validateCouponSchema.parse(await req.json());

    const coupon = await db.couponCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return apiError("Cuponul nu este valid", 404);
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return apiError("Cuponul a expirat", 400);
    }
    if (
      coupon.maxUsageCount !== null &&
      coupon.usageCount >= coupon.maxUsageCount
    ) {
      return apiError("Cuponul a fost epuizat", 400);
    }
    const minOrder = coupon.minOrderAmount ? coupon.minOrderAmount.toNumber() : 0;
    if (subtotal < minOrder) {
      return apiError(
        `Comandă minimă de ${minOrder} RON pentru acest cupon`,
        400,
      );
    }

    const value = coupon.value.toNumber();
    const raw =
      coupon.type === CouponType.PERCENTAGE ? (subtotal * value) / 100 : value;
    const discountAmount = round2(Math.min(raw, subtotal));

    const result: CouponValidationResult = {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value,
      discountAmount,
    };
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
