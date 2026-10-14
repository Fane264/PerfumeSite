import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/admin/variants?q= — searchable active variant list for the flash-sale
// and bundle builders. Admin only.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const where: Prisma.DecantVariantWhereInput = {
      isActive: true,
      ...(q
        ? {
            perfume: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { house: { name: { contains: q, mode: "insensitive" } } },
              ],
            },
          }
        : {}),
    };

    const variants = await db.decantVariant.findMany({
      where,
      take: 30,
      orderBy: [{ perfume: { name: "asc" } }, { sizeML: "asc" }],
      include: {
        perfume: {
          select: { name: true, house: { select: { name: true } } },
        },
      },
    });

    return apiSuccess(
      variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        sizeML: toNumber(v.sizeML),
        price: toNumber(v.price),
        currency: v.currency,
        perfumeName: v.perfume.name,
        houseName: v.perfume.house.name,
        label: `${v.perfume.name} — ${toNumber(v.sizeML)}ml (${v.perfume.house.name})`,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
