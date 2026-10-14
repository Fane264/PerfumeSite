import { NextRequest } from "next/server";
import { z } from "zod";
import { LoyaltyEventType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { awardPoints, REVIEW_BONUS } from "@/lib/loyalty";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

const updateReviewSchema = z.object({
  isApproved: z.boolean(),
});

// PATCH /api/admin/reviews/[id] — approve or reject a review. Admin only.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { isApproved } = updateReviewSchema.parse(await req.json());

    const existing = await db.review.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });
    if (!existing) return apiError("Recenzia nu a fost găsită", 404);

    const review = await db.review.update({
      where: { id: params.id },
      data: { isApproved },
      select: { id: true, isApproved: true },
    });

    // Award review points once, on first approval. Guard on a prior REVIEW
    // ledger entry so re-approving never double-credits.
    if (isApproved) {
      const alreadyAwarded = await db.loyaltyTransaction.findFirst({
        where: { type: LoyaltyEventType.REVIEW, reviewId: review.id },
        select: { id: true },
      });
      if (!alreadyAwarded) {
        try {
          await awardPoints(existing.userId, REVIEW_BONUS, LoyaltyEventType.REVIEW, {
            description: "Puncte pentru o recenzie aprobată",
            reviewId: review.id,
          });
        } catch (err) {
          console.error("[admin/reviews] review points failed:", err);
        }
      }
    }

    return apiSuccess(review);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/reviews/[id] — remove a review entirely. Admin only.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const existing = await db.review.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return apiError("Recenzia nu a fost găsită", 404);

    await db.review.delete({ where: { id: params.id } });
    return apiSuccess({ id: params.id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
