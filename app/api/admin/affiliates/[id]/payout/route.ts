import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { affiliatePayoutSchema } from "@/lib/validations/affiliate";
import { ConversionStatus } from "@prisma/client";
import { serializeAdminAffiliate } from "@/lib/affiliate";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// POST /api/admin/affiliates/[id]/payout — record a manual payout, mark the
// affiliate's confirmed conversions as PAID, and bump totalPaid. Admin only.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const account = await db.affiliateAccount.findUnique({
      where: { id: params.id },
      select: { id: true, totalEarned: true, totalPaid: true },
    });
    if (!account) return apiError("Afiliatul nu a fost găsit", 404);

    const input = affiliatePayoutSchema.parse(await req.json());

    const available =
      account.totalEarned.toNumber() - account.totalPaid.toNumber();
    if (input.amount > available + 0.001) {
      throw new BadRequestError(
        `Suma depășește soldul disponibil (${available.toFixed(2)})`,
      );
    }

    await db.$transaction([
      db.affiliatePayout.create({
        data: {
          affiliateId: account.id,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          paidAt: new Date(),
        },
      }),
      db.affiliateAccount.update({
        where: { id: account.id },
        data: { totalPaid: { increment: input.amount } },
      }),
      db.affiliateConversion.updateMany({
        where: { affiliateId: account.id, status: ConversionStatus.CONFIRMED },
        data: { status: ConversionStatus.PAID },
      }),
    ]);

    const updated = await db.affiliateAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { conversions: true } },
      },
    });

    return apiSuccess(serializeAdminAffiliate(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
