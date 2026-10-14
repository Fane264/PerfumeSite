import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { buildScentProfile } from "@/lib/scent-profile";

export const runtime = "nodejs";
// The profile itself is cached for an hour via `unstable_cache`.
export const revalidate = 3600;

// GET /api/scent-profile — the current user's olfactory profile.
export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await buildScentProfile(user.id);
    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
