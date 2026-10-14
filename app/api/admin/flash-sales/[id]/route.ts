import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateFlashSaleSchema } from "@/lib/validations/flash-sale";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/flash-sales/[id] — update a sale; replace products when sent.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const input = updateFlashSaleSchema.parse(await req.json());

    const existing = await db.flashSale.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Vânzarea nu a fost găsită", 404);

    const data: Prisma.FlashSaleUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.discountType !== undefined) data.discountType = input.discountType;
    if (input.discountValue !== undefined)
      data.discountValue = new Prisma.Decimal(input.discountValue);
    if (input.startsAt !== undefined) data.startsAt = input.startsAt;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt;
    if (input.bannerColor !== undefined) data.bannerColor = input.bannerColor;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    await db.$transaction(async (tx) => {
      await tx.flashSale.update({ where: { id: params.id }, data });

      if (input.products) {
        const variantIds = input.products.map((p) => p.variantId);
        const variants = await tx.decantVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, price: true },
        });
        const priceById = new Map(variants.map((v) => [v.id, v.price]));

        await tx.flashSaleProduct.deleteMany({ where: { flashSaleId: params.id } });
        if (input.products.length > 0) {
          await tx.flashSaleProduct.createMany({
            data: input.products
              .filter((p) => priceById.has(p.variantId))
              .map((p) => ({
                flashSaleId: params.id,
                variantId: p.variantId,
                originalPrice: priceById.get(p.variantId)!,
                salePrice: new Prisma.Decimal(p.salePrice),
                stockLimit: p.stockLimit ?? null,
              })),
          });
        }
      }
    });

    return apiSuccess({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/flash-sales/[id] — remove a sale and its product lines.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const existing = await db.flashSale.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Vânzarea nu a fost găsită", 404);

    await db.flashSale.delete({ where: { id: params.id } });
    return apiSuccess({ id: params.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
