import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import {
  createProductVideoSchema,
  reorderProductVideosSchema,
} from "@/lib/validations/video";

export const runtime = "nodejs";

type RouteContext = { params: { slug: string } };

async function findPerfumeId(slug: string): Promise<string | null> {
  const perfume = await db.perfume.findUnique({
    where: { slug },
    select: { id: true },
  });
  return perfume?.id ?? null;
}

function serialize(v: {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  duration: number | null;
  position: number;
  isActive: boolean;
}) {
  return {
    id: v.id,
    url: v.url,
    thumbnailUrl: v.thumbnailUrl,
    title: v.title,
    duration: v.duration,
    position: v.position,
    isActive: v.isActive,
  };
}

// GET /api/admin/products/[slug]/videos — list a perfume's videos.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const perfumeId = await findPerfumeId(params.slug);
    if (!perfumeId) return apiError("Parfumul nu a fost găsit", 404);

    const videos = await db.productVideo.findMany({
      where: { perfumeId },
      orderBy: { position: "asc" },
    });
    return apiSuccess(videos.map(serialize));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/products/[slug]/videos — attach a Cloudinary video.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const perfumeId = await findPerfumeId(params.slug);
    if (!perfumeId) return apiError("Parfumul nu a fost găsit", 404);

    const input = createProductVideoSchema.parse(await req.json());
    const last = await db.productVideo.findFirst({
      where: { perfumeId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const video = await db.productVideo.create({
      data: {
        perfumeId,
        url: input.url,
        thumbnailUrl: input.thumbnailUrl ?? null,
        title: input.title ?? null,
        duration: input.duration ?? null,
        position: (last?.position ?? -1) + 1,
      },
    });
    return apiSuccess(serialize(video), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/products/[slug]/videos — bulk reorder by id list.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const perfumeId = await findPerfumeId(params.slug);
    if (!perfumeId) return apiError("Parfumul nu a fost găsit", 404);

    const { order } = reorderProductVideosSchema.parse(await req.json());
    await db.$transaction(
      order.map((id, index) =>
        db.productVideo.updateMany({
          where: { id, perfumeId },
          data: { position: index },
        }),
      ),
    );
    return apiSuccess({ reordered: order.length });
  } catch (error) {
    return handleApiError(error);
  }
}
