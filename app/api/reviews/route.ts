import { NextRequest } from "next/server";
import { Prisma, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  apiError,
  apiSuccess,
  buildPaginationMeta,
  handleApiError,
} from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { createReviewSchema, reviewQuerySchema } from "@/lib/validations/review";
import { searchParamsToObject } from "@/lib/validations/common";
import { serializeReview } from "@/lib/serializers";
import { enforceRateLimit, strictRatelimit } from "@/lib/ratelimit";
import { getRatingSummary } from "@/lib/ratings";

export const runtime = "nodejs";

const reviewAuthorInclude = {
  user: { select: { firstName: true, lastName: true, imageUrl: true } },
  images: { select: { id: true, url: true, altText: true } },
} satisfies Prisma.ReviewInclude;

// GET /api/reviews — product reviews (`?perfumeId=`) or the homepage UGC
// gallery (`?hasImages=true`, approved reviews with at least one image).
export async function GET(req: NextRequest) {
  try {
    const { perfumeId, hasImages, page, limit } = reviewQuerySchema.parse(
      searchParamsToObject(req.nextUrl.searchParams),
    );

    // ---- UGC gallery mode -------------------------------------------------
    if (!perfumeId && hasImages) {
      const galleryRows = await db.review.findMany({
        where: { isApproved: true, images: { some: {} } },
        include: {
          ...reviewAuthorInclude,
          perfume: {
            select: {
              name: true,
              slug: true,
              house: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const items = galleryRows.map((review) => ({
        ...serializeReview(review),
        perfume: {
          name: review.perfume.name,
          slug: review.perfume.slug,
          houseName: review.perfume.house.name,
        },
      }));
      return apiSuccess(items);
    }

    // ---- Product reviews mode --------------------------------------------
    if (!perfumeId) {
      return apiError("Parametrul perfumeId este obligatoriu", 400);
    }

    const [reviews, total, rating] = await Promise.all([
      db.review.findMany({
        where: { perfumeId, isApproved: true },
        include: reviewAuthorInclude,
        orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.review.count({ where: { perfumeId, isApproved: true } }),
      getRatingSummary(perfumeId),
    ]);

    return apiSuccess(reviews.map(serializeReview), {
      pagination: buildPaginationMeta(total, page, limit),
      rating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/reviews — submit a review (pending admin approval).
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(strictRatelimit, req);
    if (limited) return limited;

    const user = await requireAuth();
    const input = createReviewSchema.parse(await req.json());

    const perfume = await db.perfume.findUnique({
      where: { id: input.perfumeId },
      select: { id: true, isActive: true },
    });
    if (!perfume || !perfume.isActive) {
      return apiError("Parfumul nu a fost găsit", 404);
    }

    const existing = await db.review.findUnique({
      where: { userId_perfumeId: { userId: user.id, perfumeId: input.perfumeId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError("Ai recenzat deja acest parfum");
    }

    // Verified purchase = a delivered order containing this perfume.
    const purchase = await db.orderItem.findFirst({
      where: {
        order: { userId: user.id, status: OrderStatus.DELIVERED },
        variant: { perfumeId: input.perfumeId },
      },
      select: { id: true },
    });

    const review = await db.review.create({
      data: {
        userId: user.id,
        perfumeId: input.perfumeId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        isVerifiedPurchase: Boolean(purchase),
        isApproved: false,
        videoUrl: input.videoUrl ?? null,
        ...(input.images && input.images.length > 0
          ? {
              images: {
                create: input.images.map((url) => ({
                  url,
                  altText: input.title,
                })),
              },
            }
          : {}),
      },
    });

    return apiSuccess(
      {
        id: review.id,
        isApproved: false,
        isVerifiedPurchase: review.isVerifiedPurchase,
        message: "Recenzia ta a fost trimisă și va fi publicată după aprobare.",
      },
      undefined,
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
