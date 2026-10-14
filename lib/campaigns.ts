import {
  CampaignSegment,
  CampaignStatus,
  LoyaltyTier,
  OrderStatus,
  SubscriptionStatus,
  type EmailCampaign,
} from "@prisma/client";
import { db } from "./db";
import { APP_URL } from "./constants";
import { getResendClient, DEFAULT_EMAIL_FROM } from "./resend";

export interface ApiCampaign {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  htmlContent: string;
  segment: CampaignSegment;
  status: CampaignStatus;
  sentCount: number;
  openRate: number | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export function serializeCampaign(c: EmailCampaign): ApiCampaign {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    preheader: c.preheader,
    htmlContent: c.htmlContent,
    segment: c.segment,
    status: c.status,
    sentCount: c.sentCount,
    openRate: c.openRate ? c.openRate.toNumber() : null,
    scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
    sentAt: c.sentAt ? c.sentAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  };
}

// ----------------------------------------------------------------------------
//  Email campaign manager (Phase 7). Resolves audience segments and sends
//  batched campaigns via the Resend batch API. Degrades to a logged no-op when
//  Resend is not configured.
// ----------------------------------------------------------------------------

export interface SegmentRecipient {
  email: string;
  firstName: string;
}

const BATCH_SIZE = 100; // Resend batch API limit per request.

const DAY_MS = 24 * 60 * 60 * 1000;

// Order statuses that count as a "real" customer order.
const ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PAID_COD,
  OrderStatus.PENDING_COD,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

function toRecipient(u: {
  email: string;
  firstName: string | null;
}): SegmentRecipient {
  return { email: u.email, firstName: u.firstName?.trim() || "client" };
}

/** Resolve the list of recipients for a segment. */
export async function getSegmentEmails(
  segment: CampaignSegment,
): Promise<SegmentRecipient[]> {
  const select = { email: true, firstName: true } as const;
  const base = { deletedAt: null } as const;

  switch (segment) {
    case CampaignSegment.ALL_CUSTOMERS: {
      const users = await db.user.findMany({
        where: { ...base, orders: { some: { status: { in: ORDER_STATUSES } } } },
        select,
      });
      return users.map(toRecipient);
    }

    case CampaignSegment.NEWSLETTER_SUBSCRIBERS: {
      // No local subscriber table — treat all active accounts as reachable.
      const users = await db.user.findMany({ where: base, select });
      return users.map(toRecipient);
    }

    case CampaignSegment.LOYAL_CUSTOMERS: {
      const users = await db.user.findMany({
        where: {
          ...base,
          loyaltyAccount: {
            tier: { in: [LoyaltyTier.GOLD, LoyaltyTier.PLATINUM] },
          },
        },
        select,
      });
      return users.map(toRecipient);
    }

    case CampaignSegment.INACTIVE_90_DAYS: {
      const cutoff = new Date(Date.now() - 90 * DAY_MS);
      const users = await db.user.findMany({
        where: {
          ...base,
          orders: { some: { status: { in: ORDER_STATUSES } } },
          // No order in the last 90 days.
          NOT: { orders: { some: { createdAt: { gte: cutoff } } } },
        },
        select,
      });
      return users.map(toRecipient);
    }

    case CampaignSegment.SUBSCRIPTION_ACTIVE: {
      const users = await db.user.findMany({
        where: {
          ...base,
          subscription: { status: SubscriptionStatus.ACTIVE },
        },
        select,
      });
      return users.map(toRecipient);
    }

    case CampaignSegment.NEW_CUSTOMERS: {
      const cutoff = new Date(Date.now() - 30 * DAY_MS);
      const users = await db.user.findMany({
        where: {
          ...base,
          orders: { some: { createdAt: { gte: cutoff } } },
        },
        select,
      });
      return users.map(toRecipient);
    }

    default:
      return [];
  }
}

/** Recipient count per segment, for the campaign composer's estimates. */
export async function getSegmentCounts(): Promise<
  Record<CampaignSegment, number>
> {
  const segments = Object.values(CampaignSegment);
  const counts = await Promise.all(
    segments.map(async (s) => [s, (await getSegmentEmails(s)).length] as const),
  );
  return Object.fromEntries(counts) as Record<CampaignSegment, number>;
}

/** Interpolate the supported template variables for a recipient. */
export function renderCampaignHtml(
  html: string,
  recipient: SegmentRecipient,
): string {
  const unsubscribeUrl = `${APP_URL}/cont?unsubscribe=1`;
  return html
    .replaceAll("{{firstName}}", recipient.firstName)
    .replaceAll("{{unsubscribeUrl}}", unsubscribeUrl);
}

/**
 * Send a campaign to its segment in batches of 100 (Resend batch API),
 * updating `sentCount` and the campaign status. Idempotency is the caller's
 * responsibility (guard on status before invoking).
 */
export async function sendCampaign(campaignId: string): Promise<void> {
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campania nu a fost găsită");

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: CampaignStatus.SENDING },
  });

  const resend = getResendClient();
  const recipients = await getSegmentEmails(campaign.segment);

  let sent = 0;
  try {
    if (!resend) {
      console.warn(
        `[Campaigns] Resend not configured — campaign "${campaign.name}" not sent (${recipients.length} recipients)`,
      );
    } else {
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE).map((r) => ({
          from: DEFAULT_EMAIL_FROM,
          to: r.email,
          subject: campaign.subject,
          html: renderCampaignHtml(campaign.htmlContent, r),
        }));
        const { error } = await resend.batch.send(batch);
        if (error) {
          console.error("[Campaigns] batch send failed:", error);
        } else {
          sent += batch.length;
        }
      }
    }

    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        sentCount: sent,
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Campaigns] send failed:", err);
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.DRAFT, sentCount: sent },
    });
    throw err;
  }
}
