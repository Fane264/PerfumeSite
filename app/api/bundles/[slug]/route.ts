import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { getBundleBySlug } from "@/lib/bundles";

export const runtime = "nodejs";

type RouteContext = { params: { slug: string } };

// GET /api/bundles/[slug] — a single active bundle, or 404.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const bundle = await getBundleBySlug(params.slug);
    if (!bundle) return apiError("Setul nu a fost găsit", 404);
    return apiSuccess(bundle);
  } catch (error) {
    return handleApiError(error);
  }
}
