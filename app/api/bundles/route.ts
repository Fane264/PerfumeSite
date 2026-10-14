import { apiSuccess, handleApiError } from "@/lib/api-response";
import { getActiveBundles } from "@/lib/bundles";

export const runtime = "nodejs";
export const revalidate = 300;

// GET /api/bundles — public list of active bundles with savings computed.
export async function GET() {
  try {
    const bundles = await getActiveBundles();
    return apiSuccess(bundles);
  } catch (error) {
    return handleApiError(error);
  }
}
