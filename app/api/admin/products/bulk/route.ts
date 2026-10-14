import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

const bulkProductSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selectează cel puțin un produs"),
  // "delete" is a soft-delete (isActive = false) — historical orders keep their
  // product references intact.
  action: z.enum(["activate", "deactivate", "delete"]),
});

// PATCH /api/admin/products/bulk — bulk activate / deactivate / soft-delete.
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const { ids, action } = bulkProductSchema.parse(await req.json());

    const isActive = action === "activate";
    const result = await db.perfume.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    return apiSuccess({ updated: result.count, isActive });
  } catch (error) {
    return handleApiError(error);
  }
}
