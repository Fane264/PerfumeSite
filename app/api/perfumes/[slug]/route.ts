import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  apiSuccess,
  buildPaginationMeta,
  handleApiError,
} from "@/lib/api-response";
import { updatePerfumeSchema } from "@/lib/validations/product";
import {
  serializePerfumeDetail,
  serializePerfumeListItem,
  serializeReview,
  perfumeToSearchRecord,
} from "@/lib/serializers";
import { getRatingSummary } from "@/lib/ratings";
import { getActiveFlashSaleVariantMap } from "@/lib/flash-sales";
import { perfumeDetailArgs, perfumeListArgs } from "@/types";
import { slugify, generateSku } from "@/lib/utils";
import { MAX_PAGE_SIZE } from "@/lib/constants";
import { indexPerfume, removePerfume } from "@/lib/algolia";

export const runtime = "nodejs";

type RouteContext = { params: { slug: string } };

const reviewAuthorSelect = {
  user: { select: { firstName: true, lastName: true, imageUrl: true } },
  images: { select: { id: true, url: true, altText: true } },
} satisfies Prisma.ReviewInclude;

// ----------------------------------------------------------------------------
//  GET /api/perfumes/[slug] — full detail + paginated reviews + related items.
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const perfume = await db.perfume.findUnique({
      where: { slug: params.slug },
      ...perfumeDetailArgs,
    });

    if (!perfume || !perfume.isActive) {
      return apiError("Parfumul nu a fost găsit", 404);
    }

    const reviewsPage = Math.max(
      1,
      Number(req.nextUrl.searchParams.get("reviewsPage") ?? "1") || 1,
    );
    const reviewsLimit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(req.nextUrl.searchParams.get("reviewsLimit") ?? "10") || 10),
    );

    const noteIds = perfume.notes.map((n) => n.noteId);

    const [rating, reviews, reviewCount, related, flashSaleByVariant] =
      await Promise.all([
        getRatingSummary(perfume.id),
      db.review.findMany({
        where: { perfumeId: perfume.id, isApproved: true },
        include: reviewAuthorSelect,
        orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
        skip: (reviewsPage - 1) * reviewsLimit,
        take: reviewsLimit,
      }),
      db.review.count({ where: { perfumeId: perfume.id, isApproved: true } }),
      db.perfume.findMany({
        where: {
          isActive: true,
          id: { not: perfume.id },
          OR: [
            { familyId: perfume.familyId },
            ...(noteIds.length > 0
              ? [{ notes: { some: { noteId: { in: noteIds } } } }]
              : []),
          ],
        },
        ...perfumeListArgs,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
      getActiveFlashSaleVariantMap(),
    ]);

    const data = {
      ...serializePerfumeDetail(perfume, rating, flashSaleByVariant),
      reviews: {
        items: reviews.map(serializeReview),
        pagination: buildPaginationMeta(reviewCount, reviewsPage, reviewsLimit),
      },
      related: related.map((p) =>
        serializePerfumeListItem(p, undefined, flashSaleByVariant),
      ),
    };

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// ----------------------------------------------------------------------------
//  PUT /api/perfumes/[slug] — full update incl. variants/notes/images. Admin.
// ----------------------------------------------------------------------------
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.perfume.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true },
    });
    if (!existing) return apiError("Parfumul nu a fost găsit", 404);

    const input = updatePerfumeSchema.parse(await req.json());
    const perfumeId = existing.id;
    const slug = input.slug ?? existing.slug;

    // Scalar field updates (only those supplied).
    const scalarData: Prisma.PerfumeUpdateInput = {};
    if (input.name !== undefined) scalarData.name = input.name;
    if (input.slug !== undefined) scalarData.slug = input.slug;
    if (input.description !== undefined) scalarData.description = input.description;
    if (input.story !== undefined) scalarData.story = input.story;
    if (input.gender !== undefined) scalarData.gender = input.gender;
    if (input.concentration !== undefined)
      scalarData.concentration = input.concentration;
    if (input.launchYear !== undefined) scalarData.launchYear = input.launchYear;
    if (input.perfumer !== undefined) scalarData.perfumer = input.perfumer;
    if (input.isActive !== undefined) scalarData.isActive = input.isActive;
    if (input.isFeatured !== undefined) scalarData.isFeatured = input.isFeatured;
    if (input.metaTitle !== undefined) scalarData.metaTitle = input.metaTitle;
    if (input.metaDescription !== undefined)
      scalarData.metaDescription = input.metaDescription;
    if (input.houseId !== undefined)
      scalarData.house = { connect: { id: input.houseId } };
    if (input.familyId !== undefined)
      scalarData.family = { connect: { id: input.familyId } };

    await db.$transaction(async (tx) => {
      await tx.perfume.update({ where: { id: perfumeId }, data: scalarData });

      // Replace images wholesale when provided.
      if (input.images) {
        await tx.perfumeImage.deleteMany({ where: { perfumeId } });
        if (input.images.length > 0) {
          const images = input.images.map((img, index) => ({
            perfumeId,
            url: img.url,
            altText: img.altText ?? null,
            position: img.position || index,
            isPrimary: img.isPrimary,
          }));
          if (!images.some((img) => img.isPrimary)) images[0]!.isPrimary = true;
          await tx.perfumeImage.createMany({ data: images });
        }
      }

      // Replace note assignments wholesale when provided.
      if (input.notes) {
        await tx.perfumeNote.deleteMany({ where: { perfumeId } });
        if (input.notes.length > 0) {
          await tx.perfumeNote.createMany({
            data: input.notes.map((n) => ({
              perfumeId,
              noteId: n.noteId,
              position: n.position,
            })),
          });
        }
      }

      // Upsert variants by size; deactivate (never delete) removed ones so
      // historical order references stay intact.
      if (input.variants) {
        for (const v of input.variants) {
          const variant = await tx.decantVariant.upsert({
            where: { perfumeId_sizeML: { perfumeId, sizeML: v.sizeML } },
            create: {
              perfumeId,
              sizeML: v.sizeML,
              price: v.price,
              currency: v.currency,
              sku: v.sku ?? generateSku(slug, v.sizeML),
              isActive: v.isActive,
            },
            update: {
              price: v.price,
              currency: v.currency,
              isActive: v.isActive,
              ...(v.sku ? { sku: v.sku } : {}),
            },
          });
          // Keep inventory row in sync; do not clobber on-hand quantity here
          // (stock is adjusted via the dedicated inventory endpoint).
          await tx.inventory.upsert({
            where: { variantId: variant.id },
            create: {
              variantId: variant.id,
              quantity: v.initialQuantity,
              lowStockThreshold: v.lowStockThreshold,
            },
            update: { lowStockThreshold: v.lowStockThreshold },
          });
        }
        await tx.decantVariant.updateMany({
          where: {
            perfumeId,
            sizeML: { notIn: input.variants.map((v) => v.sizeML) },
          },
          data: { isActive: false },
        });
      }
    });

    const updated = await db.perfume.findUniqueOrThrow({
      where: { id: perfumeId },
      ...perfumeDetailArgs,
    });
    const rating = await getRatingSummary(perfumeId);

    try {
      if (updated.isActive) {
        await indexPerfume(perfumeToSearchRecord(updated));
      } else {
        await removePerfume(updated.id);
      }
    } catch (err) {
      console.error("[Algolia] reindex failed:", err);
    }

    return apiSuccess(serializePerfumeDetail(updated, rating));
  } catch (error) {
    return handleApiError(error);
  }
}

// ----------------------------------------------------------------------------
//  DELETE /api/perfumes/[slug] — soft delete (isActive = false). Admin.
// ----------------------------------------------------------------------------
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.perfume.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return apiError("Parfumul nu a fost găsit", 404);

    await db.perfume.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    try {
      await removePerfume(existing.id);
    } catch (err) {
      console.error("[Algolia] removePerfume failed:", err);
    }

    return apiSuccess({ id: existing.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
