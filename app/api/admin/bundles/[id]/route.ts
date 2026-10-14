import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateBundleSchema } from "@/lib/validations/bundle";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// PATCH /api/admin/bundles/[id] — update a bundle; replace items when provided.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const input = updateBundleSchema.parse(await req.json());

    const existing = await db.bundle.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Setul nu a fost găsit", 404);

    const data: Prisma.BundleUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.slug !== undefined) data.slug = slugify(input.slug);
    if (input.description !== undefined) data.description = input.description;
    if (input.price !== undefined) data.price = new Prisma.Decimal(input.price);
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;

    await db.$transaction(async (tx) => {
      await tx.bundle.update({ where: { id: params.id }, data });
      if (input.items) {
        await tx.bundleItem.deleteMany({ where: { bundleId: params.id } });
        if (input.items.length > 0) {
          await tx.bundleItem.createMany({
            data: input.items.map((i) => ({
              bundleId: params.id,
              variantId: i.variantId,
              quantity: i.quantity,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return apiSuccess({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/bundles/[id] — soft delete (isActive = false). Admin only.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const existing = await db.bundle.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Setul nu a fost găsit", 404);

    await db.bundle.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return apiSuccess({ id: params.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
