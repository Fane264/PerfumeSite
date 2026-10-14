import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { createBundleSchema } from "@/lib/validations/bundle";
import { getActiveBundles } from "@/lib/bundles";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/admin/bundles — active bundles (admin reuses the public projection).
export async function GET() {
  try {
    await requireAdmin();
    return apiSuccess(await getActiveBundles());
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/bundles — create a bundle with its items. Admin only.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createBundleSchema.parse(await req.json());
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const variantIds = input.items.map((i) => i.variantId);
    const found = await db.decantVariant.count({
      where: { id: { in: variantIds }, isActive: true },
    });
    if (found !== new Set(variantIds).size) {
      return apiError("Una sau mai multe variante sunt invalide", 400);
    }

    const bundle = await db.bundle.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        descriptionEn: input.descriptionEn ?? null,
        price: new Prisma.Decimal(input.price),
        imageUrl: input.imageUrl ?? null,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        items: {
          create: input.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      },
      select: { id: true, slug: true },
    });

    return apiSuccess(bundle, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
