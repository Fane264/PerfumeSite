import webpush from "web-push";
import { db } from "./db";
import { env } from "./env";

// ----------------------------------------------------------------------------
//  Web push notifications (Phase 7). Server-only — never import into a client
//  bundle. VAPID keys are optional; without them every send is a logged no-op.
// ----------------------------------------------------------------------------

let configured = false;

/** Configure web-push lazily and report whether VAPID keys are available. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    `mailto:${env.ADMIN_EMAIL ?? "admin@decantlux.ro"}`,
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export function isPushEnabled(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY,
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send to a single stored subscription; prune it if the endpoint is gone. */
export async function sendPushNotification(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404/410 → subscription expired; remove it so we stop retrying.
    if (statusCode === 404 || statusCode === 410) {
      await db.pushSubscription
        .deleteMany({ where: { endpoint: subscription.endpoint } })
        .catch(() => undefined);
    } else {
      console.error("[webpush] send failed:", err);
    }
  }
}

/** Send to every subscription a user has registered. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  await Promise.all(subs.map((s) => sendPushNotification(s, payload)));
}

/** Broadcast to all subscriptions (e.g. flash-sale announcements). */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const subs = await db.pushSubscription.findMany();
  // Cap concurrency to keep memory bounded on large lists.
  const CHUNK = 100;
  for (let i = 0; i < subs.length; i += CHUNK) {
    await Promise.all(
      subs.slice(i, i + CHUNK).map((s) => sendPushNotification(s, payload)),
    );
  }
}
