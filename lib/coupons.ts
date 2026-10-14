import { CouponType } from "@prisma/client";
import { db } from "./db";
import { BadRequestError } from "./errors";

export interface AppliedCoupon {
  id: string;
  code: string;
  /** Discount amount in store currency, rounded to 2 decimals. */
  discount: number;
}

/**
 * Validate a coupon against the current subtotal and compute its discount.
 * Throws `BadRequestError` with a user-facing reason when the coupon can't be
 * applied. Does NOT increment usage — that happens on successful payment.
 */
export async function applyCoupon(
  code: string,
  subtotal: number,
): Promise<AppliedCoupon> {
  const coupon = await db.couponCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new BadRequestError("Cuponul nu este valid");
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("Cuponul a expirat");
  }
  if (coupon.maxUsageCount !== null && coupon.usageCount >= coupon.maxUsageCount) {
    throw new BadRequestError("Cuponul a fost epuizat");
  }
  const minOrder = coupon.minOrderAmount ? coupon.minOrderAmount.toNumber() : 0;
  if (subtotal < minOrder) {
    throw new BadRequestError(
      `Comandă minimă de ${minOrder} RON pentru acest cupon`,
    );
  }

  const value = coupon.value.toNumber();
  const raw =
    coupon.type === CouponType.PERCENTAGE ? (subtotal * value) / 100 : value;
  const discount = Math.round(Math.min(raw, subtotal) * 100) / 100;

  return { id: coupon.id, code: coupon.code, discount };
}
