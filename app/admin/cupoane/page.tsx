import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  CouponManager,
  type AdminCoupon,
} from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "Admin · Cupoane" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const rows = await db.couponCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const coupons: AdminCoupon[] = rows.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value.toNumber(),
    minOrderAmount: c.minOrderAmount ? c.minOrderAmount.toNumber() : null,
    maxUsageCount: c.maxUsageCount,
    usageCount: c.usageCount,
    isActive: c.isActive,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Cupoane</h1>
        <p className="text-sm text-muted-foreground">
          {coupons.length} cupoane · {coupons.filter((c) => c.isActive).length}{" "}
          active
        </p>
      </div>
      <CouponManager coupons={coupons} />
    </div>
  );
}
