import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

// POST /api/push/unsubscribe — remove a browser push subscription.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { endpoint } = unsubscribeSchema.parse(await req.json());

    await db.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });

    return apiSuccess({ unsubscribed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
