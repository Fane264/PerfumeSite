import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { createFlashSaleSchema } from "@/lib/validations/flash-sale";
import { sendPushToAll } from "@/lib/webpush";
import { toNumber } from "@/lib/utils";

export const runtime = "nodejs";

function saleStatus(startsAt: Date, endsAt: Date, isActive: boolean) {
  const now = Date.now();
  if (!isActive || endsAt.getTime() <= now) return "expired";
  if (startsAt.getTime() > now) return "scheduled";
  return "active";
}

// GET /api/admin/flash-sales — every sale with its products. Admin only.
export async function GET() {
  try {
    await requireAdmin();
    const sales = await db.flashSale.findMany({
      orderBy: { startsAt: "desc" },
      include: {
        products: {
          include: {
            variant: {
              include: {
                perfume: { select: { name: true, house: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    return apiSuccess(
      sales.map((sale) => ({
        id: sale.id,
        title: sale.title,
        description: sale.description,
        discountType: sale.discountType,
        discountValue: toNumber(sale.discountValue),
        bannerColor: sale.bannerColor,
        isActive: sale.isActive,
        startsAt: sale.startsAt.toISOString(),
        endsAt: sale.endsAt.toISOString(),
        status: saleStatus(sale.startsAt, sale.endsAt, sale.isActive),
        products: sale.products.map((p) => ({
          id: p.id,
          variantId: p.variantId,
          perfumeName: p.variant.perfume.name,
          houseName: p.variant.perfume.house.name,
          sizeML: toNumber(p.variant.sizeML),
          originalPrice: toNumber(p.originalPrice),
          salePrice: toNumber(p.salePrice),
          stockLimit: p.stockLimit,
          unitsSold: p.unitsSold,
        })),
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/flash-sales — create a sale + its product lines. Admin only.
// `originalPrice` is captured from each variant's current price server-side.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createFlashSaleSchema.parse(await req.json());

    const variantIds = input.products.map((p) => p.variantId);
    const variants = await db.decantVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, price: true },
    });
    const priceById = new Map(variants.map((v) => [v.id, v.price]));

    for (const p of input.products) {
      if (!priceById.has(p.variantId)) {
        return apiError(`Varianta ${p.variantId} nu există`, 400);
      }
    }

    const sale = await db.flashSale.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: new Prisma.Decimal(input.discountValue),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        bannerColor: input.bannerColor,
        isActive: input.isActive,
        products: {
          create: input.products.map((p) => ({
            variantId: p.variantId,
            originalPrice: priceById.get(p.variantId)!,
            salePrice: new Prisma.Decimal(p.salePrice),
            stockLimit: p.stockLimit ?? null,
          })),
        },
      },
      include: { products: true },
    });

    // Announce an active sale to push subscribers (best-effort).
    if (sale.isActive && sale.startsAt.getTime() <= Date.now()) {
      try {
        await sendPushToAll({
          title: "🔥 Flash Sale!",
          body: sale.title,
          url: "/parfumuri?flashSale=true",
        });
      } catch (err) {
        console.error("[Flash sales] push broadcast failed:", err);
      }
    }

    return apiSuccess({ id: sale.id }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
