import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { updateProductVideoSchema } from "@/lib/validations/video";

export const runtime = "nodejs";

type RouteContext = { params: { slug: string; videoId: string } };

// PATCH /api/admin/products/[slug]/videos/[videoId] — toggle / retitle / move.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const input = updateProductVideoSchema.parse(await req.json());

    const existing = await db.productVideo.findUnique({
      where: { id: params.videoId },
      select: { id: true, perfume: { select: { slug: true } } },
    });
    if (!existing || existing.perfume.slug !== params.slug) {
      return apiError("Videoclipul nu a fost găsit", 404);
    }

    const video = await db.productVideo.update({
      where: { id: params.videoId },
      data: {
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
      },
    });
    return apiSuccess({ id: video.id, isActive: video.isActive });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/products/[slug]/videos/[videoId].
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const existing = await db.productVideo.findUnique({
      where: { id: params.videoId },
      select: { id: true, perfume: { select: { slug: true } } },
    });
    if (!existing || existing.perfume.slug !== params.slug) {
      return apiError("Videoclipul nu a fost găsit", 404);
    }

    await db.productVideo.delete({ where: { id: params.videoId } });
    return apiSuccess({ id: params.videoId, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
