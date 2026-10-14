import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { LoyaltyEventType, ReferralStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendWelcomeEmail } from "@/lib/resend";
import {
  awardPoints,
  generateReferralCode,
  getOrCreateLoyaltyAccount,
  randomCode,
  REFERRAL_RECEIVER_BONUS,
} from "@/lib/loyalty";

// Clerk → DB identity sync. Must run on the Node runtime (uses Prisma) and read
// the raw request body for Svix signature verification.
export const runtime = "nodejs";

function resolveRole(metadata: unknown): UserRole {
  const role = (metadata as { role?: unknown } | null | undefined)?.role;
  return role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;
}

/** The referrer's personal code passed through Clerk sign-up metadata. */
function resolveReferralCode(metadata: unknown): string | null {
  const code = (metadata as { referralCode?: unknown } | null | undefined)
    ?.referralCode;
  return typeof code === "string" && code.trim() ? code.trim().toUpperCase() : null;
}

/**
 * One-time provisioning on first account creation: a loyalty account, a personal
 * referral code, and — if the user was invited — a REGISTERED referral record
 * plus the welcome-points bonus. Idempotent against webhook retries.
 */
async function provisionNewUser(
  userId: string,
  email: string,
  referrerCode: string | null,
): Promise<void> {
  await getOrCreateLoyaltyAccount(userId);

  // Assign a personal referral code if the user doesn't have one yet.
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (!current?.referralCode) {
    // Retry on the (vanishingly unlikely) unique collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.user.update({
          where: { id: userId },
          data: { referralCode: generateReferralCode() },
        });
        break;
      } catch {
        if (attempt === 4) throw new Error("Nu s-a putut genera cod de referral");
      }
    }
  }

  if (!referrerCode) return;

  // Link the invite. Guard against duplicates from webhook retries.
  const existing = await db.referral.findFirst({
    where: { referredUserId: userId },
    select: { id: true },
  });
  if (existing) return;

  const referrer = await db.user.findUnique({
    where: { referralCode: referrerCode },
    select: { id: true },
  });
  if (!referrer || referrer.id === userId) return;

  await db.referral.create({
    data: {
      referrerId: referrer.id,
      referredEmail: email,
      referredUserId: userId,
      code: `RC-${randomCode(8)}`,
      status: ReferralStatus.REGISTERED,
    },
  });

  // Welcome bonus for the invited user (best-effort; never block sync).
  try {
    await awardPoints(userId, REFERRAL_RECEIVER_BONUS, LoyaltyEventType.REFERRAL_RECEIVE, {
      description: "Bonus de bun venit prin invitație",
    });
  } catch (err) {
    console.error("[Clerk webhook] referral welcome bonus failed:", err);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Clerk webhook] CLERK_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { data: null, error: "Webhook indisponibil" },
      { status: 500 },
    );
  }

  // Svix signature headers.
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { data: null, error: "Headere de semnătură lipsă" },
      { status: 400 },
    );
  }

  const payload = await req.text();

  let event: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("[Clerk webhook] Signature verification failed:", error);
    return NextResponse.json(
      { data: null, error: "Semnătură invalidă" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const {
          id,
          email_addresses,
          primary_email_address_id,
          first_name,
          last_name,
          image_url,
          public_metadata,
        } = event.data;

        const email =
          email_addresses.find((e) => e.id === primary_email_address_id)
            ?.email_address ?? email_addresses[0]?.email_address;

        if (!email) {
          console.warn(`[Clerk webhook] ${event.type} ${id} has no email`);
          break;
        }

        const role = resolveRole(public_metadata);

        await db.user.upsert({
          where: { id },
          create: {
            id,
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            role,
          },
          update: {
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            role,
          },
        });

        // First-creation provisioning: loyalty account, referral code, invite
        // linking + welcome email (all best-effort, never blocks identity sync).
        if (event.type === "user.created") {
          try {
            await provisionNewUser(id, email, resolveReferralCode(public_metadata));
          } catch (err) {
            console.error("[Clerk webhook] new-user provisioning failed:", err);
          }
          try {
            await sendWelcomeEmail(email, { firstName: first_name });
          } catch (err) {
            console.error("[Clerk webhook] welcome email failed:", err);
          }
        }
        break;
      }

      case "user.deleted": {
        const id = event.data.id;
        if (id) {
          // Anonymize rather than hard-delete so historical orders survive.
          await db.user.updateMany({
            where: { id },
            data: {
              email: `deleted+${id}@deleted.local`,
              firstName: null,
              lastName: null,
              imageUrl: null,
              deletedAt: new Date(),
            },
          });
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Clerk stops retrying.
        break;
    }
  } catch (error) {
    console.error(`[Clerk webhook] Error handling ${event.type}:`, error);
    return NextResponse.json(
      { data: null, error: "Eroare la procesarea evenimentului" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { received: true }, error: null });
}
