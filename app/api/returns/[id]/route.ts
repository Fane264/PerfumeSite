import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { returnInclude, serializeReturn } from "@/lib/returns";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

// GET /api/returns/[id] — return details, visible to its owner or an admin.
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();

    const returnRequest = await db.returnRequest.findUnique({
      where: { id: params.id },
      include: returnInclude,
    });
    if (!returnRequest) return apiError("Returul nu a fost găsit", 404);

    if (returnRequest.userId !== user.id && user.role !== UserRole.ADMIN) {
      return apiError("Acces interzis", 403);
    }

    return apiSuccess(serializeReturn(returnRequest));
  } catch (error) {
    return handleApiError(error);
  }
}
