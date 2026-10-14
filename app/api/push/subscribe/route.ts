import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

// POST /api/push/subscribe — upsert a browser push subscription for the user.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { subscription } = subscribeSchema.parse(await req.json());

    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return apiSuccess({ subscribed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
