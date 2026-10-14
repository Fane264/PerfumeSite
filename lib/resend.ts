import { Resend } from "resend";
import { formatPrice } from "./utils";
import { APP_URL, RETURN_WAREHOUSE_ADDRESS } from "./constants";
import { env } from "./env";

// Transactional email via Resend. Falls back to a logged no-op when the API key
// is missing so local development and CI never crash on email sends.

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const EMAIL_FROM =
  env.EMAIL_FROM ?? "Decanturi Niche <onboarding@resend.dev>";
const EMAIL_REPLY_TO = env.EMAIL_REPLY_TO;

const BRAND = {
  name: "Decanturi Niche",
  gold: "#C8A951",
  ink: "#1c1917",
  paper: "#faf7f0",
  muted: "#78716c",
};

// ----------------------------------------------------------------------------
//  Decoupled email payload types (independent of Prisma models).
// ----------------------------------------------------------------------------

export interface OrderEmailItem {
  perfumeName: string;
  houseName: string;
  sizeML: number;
  quantity: number;
  unitPrice: number;
}

export interface OrderEmailShippingAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: OrderEmailShippingAddress;
  giftWrap?: boolean;
  giftWrapFee?: number;
}

interface SendResult {
  sent: boolean;
  id?: string;
}

// ----------------------------------------------------------------------------
//  Shared HTML shell
// ----------------------------------------------------------------------------

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.paper};font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #ece6da;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND.ink};padding:28px 32px;text-align:center;">
                <span style="color:${BRAND.gold};font-size:24px;letter-spacing:3px;text-transform:uppercase;">${BRAND.name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">${bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #ece6da;text-align:center;color:${BRAND.muted};font-size:13px;font-family:Arial,sans-serif;">
                <p style="margin:0 0 6px;">${BRAND.name} — decanturi din parfumuri de nișă.</p>
                <p style="margin:0;"><a href="${APP_URL}" style="color:${BRAND.muted};">${APP_URL.replace(/^https?:\/\//, "")}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function itemsTable(items: OrderEmailItem[], currency: string): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;">
          <strong style="font-size:15px;">${item.perfumeName}</strong><br />
          <span style="color:${BRAND.muted};font-size:13px;font-family:Arial,sans-serif;">${item.houseName} · ${item.sizeML} ml × ${item.quantity}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;text-align:right;white-space:nowrap;font-family:Arial,sans-serif;">
          ${formatPrice(item.unitPrice * item.quantity, currency)}
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalsBlock(order: OrderEmailData): string {
  const line = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:4px 0;font-family:Arial,sans-serif;${bold ? "font-weight:bold;font-size:16px;" : `color:${BRAND.muted};`}">${label}</td>
      <td style="padding:4px 0;text-align:right;font-family:Arial,sans-serif;${bold ? "font-weight:bold;font-size:16px;" : ""}">${value}</td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    ${line("Subtotal", formatPrice(order.subtotal, order.currency))}
    ${order.giftWrap && order.giftWrapFee ? line("🎁 Împachetare Premium", formatPrice(order.giftWrapFee, order.currency)) : ""}
    ${order.discount > 0 ? line("Reducere", `− ${formatPrice(order.discount, order.currency)}`) : ""}
    ${line("Transport", order.shippingCost > 0 ? formatPrice(order.shippingCost, order.currency) : "Gratuit")}
    ${line("Total", formatPrice(order.total, order.currency), true)}
  </table>`;
}

function addressBlock(address: OrderEmailShippingAddress): string {
  const parts = [
    address.name,
    address.line1,
    address.line2,
    `${address.postalCode} ${address.city}, ${address.county}`,
    address.country,
    `Tel: ${address.phone}`,
  ].filter(Boolean);
  return `<p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">${parts.join("<br />")}</p>`;
}

// ----------------------------------------------------------------------------
//  Public senders
// ----------------------------------------------------------------------------

/** The configured Resend client, or `null` when no API key is set. */
export function getResendClient() {
  return resend;
}

/** Default verified sender used for transactional + campaign email. */
export const DEFAULT_EMAIL_FROM = EMAIL_FROM;

/** Send a single ad-hoc email (used by campaign previews). No-op without a key. */
export async function sendRawEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  return send(to, subject, html);
}

async function send(
  to: string,
  subject: string,
  html: string,
  from: string = EMAIL_FROM,
): Promise<SendResult> {
  if (!resend) {
    console.warn(`[Resend] Skipping email "${subject}" → ${to} (no API key)`);
    return { sent: false };
  }
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
  });
  if (error) {
    console.error(`[Resend] Failed to send "${subject}":`, error);
    return { sent: false };
  }
  return { sent: true, id: data?.id };
}

/** Order confirmation with full summary, sent right after an order is placed. */
export async function sendOrderConfirmation(
  to: string,
  order: OrderEmailData,
  paymentMethod: "CARD" | "COD" = "CARD",
): Promise<SendResult> {
  const isCod = paymentMethod === "COD";

  const codBlock = isCod
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:${BRAND.paper};border:1px dashed ${BRAND.gold};border-radius:8px;">
         <tr><td style="padding:16px 20px;font-family:Arial,sans-serif;">
           <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.muted};">Metodă de plată</p>
           <p style="margin:6px 0 0;font-size:16px;color:${BRAND.ink};"><strong>Ramburs</strong> — vei plăti <strong>${formatPrice(order.total, order.currency)}</strong> în numerar la livrare.</p>
         </td></tr>
       </table>`
    : "";

  const intro = isCod
    ? `Bună, ${order.customerName}. Am înregistrat comanda ta <strong style="color:${BRAND.ink};">#${order.orderNumber}</strong>. Vei fi contactat în 24h pentru confirmare.`
    : `Bună, ${order.customerName}. Am primit comanda ta <strong style="color:${BRAND.ink};">#${order.orderNumber}</strong> și o pregătim cu grijă.`;

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">${isCod ? "Comanda ta a fost înregistrată!" : "Mulțumim pentru comandă!"}</h1>
    <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      ${intro}
    </p>
    ${itemsTable(order.items, order.currency)}
    ${totalsBlock(order)}
    ${codBlock}
    <h3 style="margin:28px 0 8px;font-size:16px;">Adresă de livrare</h3>
    ${addressBlock(order.shippingAddress)}
    <div style="margin-top:28px;text-align:center;">
      <a href="${APP_URL}/cont/comenzi" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Vezi comanda</a>
    </div>`;
  return send(
    to,
    `Confirmare comandă #${order.orderNumber} — ${BRAND.name}`,
    emailShell("Confirmare comandă", body),
  );
}

/** Shipping notification with tracking details. */
export async function sendShippingNotification(
  to: string,
  data: {
    orderNumber: string;
    customerName: string;
    trackingNumber: string;
    trackingUrl?: string | null;
  },
): Promise<SendResult> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Comanda ta a fost expediată</h1>
    <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Bună, ${data.customerName}. Comanda <strong style="color:${BRAND.ink};">#${data.orderNumber}</strong> este în drum spre tine.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};border-radius:8px;padding:16px;">
      <tr><td style="padding:8px 16px;font-family:Arial,sans-serif;">
        <span style="color:${BRAND.muted};font-size:13px;">Număr AWB</span><br />
        <strong style="font-size:18px;letter-spacing:1px;">${data.trackingNumber}</strong>
      </td></tr>
    </table>
    ${
      data.trackingUrl
        ? `<div style="margin-top:24px;text-align:center;">
            <a href="${data.trackingUrl}" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Urmărește coletul</a>
          </div>`
        : ""
    }`;
  return send(
    to,
    `Comanda #${data.orderNumber} a fost expediată — ${BRAND.name}`,
    emailShell("Comandă expediată", body),
  );
}

/** Restock alert for a previously out-of-stock variant. */
export async function sendRestockNotification(
  to: string,
  data: {
    perfumeName: string;
    sizeML: number;
    productUrl?: string;
  },
): Promise<SendResult> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">A revenit în stoc</h1>
    <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Vești bune — <strong style="color:${BRAND.ink};">${data.perfumeName}</strong> (decant ${data.sizeML} ml) este din nou disponibil. Stocul la decanturile de nișă se epuizează rapid.
    </p>
    <div style="margin-top:12px;text-align:center;">
      <a href="${data.productUrl ?? APP_URL}" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Comandă acum</a>
    </div>`;
  return send(
    to,
    `${data.perfumeName} a revenit în stoc — ${BRAND.name}`,
    emailShell("Produs disponibil din nou", body),
  );
}

/** Welcome email triggered on Clerk `user.created` (and newsletter signup). */
export async function sendWelcomeEmail(
  to: string,
  data: { firstName?: string | null } = {},
): Promise<SendResult> {
  const greeting = data.firstName ? `Bună, ${data.firstName}!` : "Bun venit!";
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">${greeting}</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Îți mulțumim că te-ai alăturat comunității <strong style="color:${BRAND.ink};">${BRAND.name}</strong>.
      Descoperă decanturi autentice din cele mai renumite case de parfumuri de nișă — testează parfumuri de lux fără să cumperi flaconul întreg.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};border:1px dashed ${BRAND.gold};border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:18px 24px;text-align:center;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px;">Cadou de bun venit</p>
        <p style="margin:6px 0 0;font-size:22px;color:${BRAND.ink};"><strong>10% reducere</strong> la prima comandă</p>
        <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:14px;color:${BRAND.muted};">Folosește codul <strong style="color:${BRAND.ink};">WELCOME10</strong> la finalizarea comenzii.</p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${APP_URL}/parfumuri" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Explorează colecția</a>
    </div>`;
  return send(to, `Bun venit la ${BRAND.name}`, emailShell("Bun venit", body));
}

// ----------------------------------------------------------------------------
//  Operational senders (abandoned cart, low-stock digest)
// ----------------------------------------------------------------------------

export interface AbandonedCartEmailItem {
  perfumeName: string;
  houseName: string;
  sizeML: number;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
}

/** Recovery email nudging a customer to finish a cart left idle. */
export async function sendAbandonedCartEmail(
  user: { email: string; firstName?: string | null },
  items: AbandonedCartEmailItem[],
): Promise<SendResult> {
  const firstName = user.firstName?.trim() || "salut";
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;width:64px;">
          ${
            item.imageUrl
              ? `<img src="${item.imageUrl}" width="56" height="56" alt="${item.perfumeName}" style="display:block;border-radius:6px;object-fit:cover;" />`
              : ""
          }
        </td>
        <td style="padding:12px 12px;border-bottom:1px solid #f0ebe0;">
          <strong style="font-size:15px;">${item.perfumeName}</strong><br />
          <span style="color:${BRAND.muted};font-size:13px;font-family:Arial,sans-serif;">${item.houseName} · ${item.sizeML} ml × ${item.quantity}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;text-align:right;white-space:nowrap;font-family:Arial,sans-serif;">
          ${formatPrice(item.unitPrice * item.quantity, "RON")}
        </td>
      </tr>`,
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Parfumurile tale te așteaptă</h1>
    <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Bună, ${firstName}. Ai lăsat câteva decanturi în coș — le-am păstrat pentru tine.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};">
      Stocul este limitat pentru articolele din coșul tău.
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/cos" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Finalizează comanda</a>
    </div>`;

  return send(
    user.email,
    `Ai uitat ceva, ${firstName}? 🖤`,
    emailShell("Coșul tău te așteaptă", body),
  );
}

export interface LowStockAlertItem {
  perfumeName: string;
  houseName: string;
  sizeML: number;
  quantity: number;
  threshold: number;
}

/** Digest of low-stock variants sent to the store operator. */
export async function sendLowStockAlert(
  adminEmail: string,
  items: LowStockAlertItem[],
): Promise<SendResult> {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;font-family:Arial,sans-serif;font-size:14px;">
          ${item.perfumeName}<br />
          <span style="color:${BRAND.muted};font-size:12px;">${item.houseName} · ${item.sizeML} ml</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;text-align:right;font-family:Arial,sans-serif;font-size:14px;">
          <strong style="color:#b91c1c;">${item.quantity}</strong>
          <span style="color:${BRAND.muted};font-size:12px;"> / prag ${item.threshold}</span>
        </td>
      </tr>`,
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;">Alertă stoc redus</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      ${items.length} ${items.length === 1 ? "variantă a ajuns" : "variante au ajuns"} la pragul de stoc redus.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="text-align:left;padding:0 0 8px;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;color:${BRAND.muted};">Produs</th>
        <th style="text-align:right;padding:0 0 8px;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;color:${BRAND.muted};">Stoc disponibil</th>
      </tr>
      ${rows}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/admin/stoc" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Gestionează stocul</a>
    </div>`;

  return send(
    adminEmail,
    `⚠️ ${items.length} produse cu stoc redus — ${BRAND.name}`,
    emailShell("Alertă stoc redus", body),
    `${BRAND.name} Stoc <stoc@decantlux.ro>`,
  );
}

/**
 * Gift card delivery email — a dark, gold-foil card visual with the code shown
 * prominently, the sender's personal message and a redeem CTA.
 */
export async function sendGiftCardEmail(
  recipientEmail: string,
  data: {
    recipientName?: string | null;
    senderName?: string | null;
    value: number;
    code: string;
    message?: string | null;
    currency?: string;
    expiresAt?: Date | null;
  },
): Promise<SendResult> {
  const currency = data.currency ?? "RON";
  const greeting = data.recipientName?.trim()
    ? `Bună, ${data.recipientName.trim()}!`
    : "Ai primit un cadou!";
  const fromLine = data.senderName?.trim()
    ? `${data.senderName.trim()} ți-a trimis un card cadou DecantLux.`
    : "Cineva drag ți-a trimis un card cadou DecantLux.";

  const expiryLine = data.expiresAt
    ? `<p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${BRAND.muted};text-align:center;">Valabil până la ${new Intl.DateTimeFormat(
        "ro-RO",
        { day: "numeric", month: "long", year: "numeric" },
      ).format(data.expiresAt)}.</p>`
    : "";

  const messageBlock = data.message?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
         <tr><td style="border-left:3px solid ${BRAND.gold};padding:8px 16px;font-family:Georgia,serif;font-style:italic;font-size:15px;color:${BRAND.ink};">
           „${data.message.trim()}"
         </td></tr>
       </table>`
    : "";

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">${greeting}</h1>
    <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">${fromLine}</p>
    ${messageBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:${BRAND.ink};border:1px solid ${BRAND.gold};border-radius:14px;">
      <tr><td style="padding:32px;text-align:center;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.gold};">Card Cadou DecantLux</p>
        <p style="margin:14px 0 0;font-size:44px;color:${BRAND.paper};">${formatPrice(data.value, currency)}</p>
        <p style="margin:18px 0 0;font-family:'Courier New',monospace;font-size:22px;letter-spacing:3px;color:${BRAND.gold};">${data.code}</p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${APP_URL}/cadou/redeem" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Folosește cadoul tău</a>
    </div>
    <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};text-align:center;">
      Introdu codul la finalizarea comenzii pentru a aplica soldul.
    </p>
    ${expiryLine}`;

  return send(
    recipientEmail,
    `Ai primit un card cadou DecantLux 🎁`,
    emailShell("Card cadou", body),
  );
}

/**
 * Add a subscriber to the configured Resend audience. No-op when Resend or the
 * audience id is not configured. Returns whether the contact was created.
 */
export async function addToNewsletterAudience(
  email: string,
): Promise<{ added: boolean }> {
  const audienceId = env.RESEND_AUDIENCE_ID;
  if (!resend || !audienceId) {
    console.warn(
      `[Resend] Skipping audience add for ${email} (no API key / audience id)`,
    );
    return { added: false };
  }
  const { error } = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });
  if (error) {
    console.error("[Resend] Failed to add contact to audience:", error);
    return { added: false };
  }
  return { added: true };
}

// ----------------------------------------------------------------------------
//  Returns portal (Phase 8)
// ----------------------------------------------------------------------------

export interface ReturnEmailItem {
  perfumeName: string;
  houseName: string;
  sizeML: number;
  quantity: number;
}

function returnItemsList(items: ReturnEmailItem[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;font-family:Arial,sans-serif;font-size:14px;">
          <strong>${item.perfumeName}</strong><br />
          <span style="color:${BRAND.muted};font-size:12px;">${item.houseName} · ${item.sizeML} ml × ${item.quantity}</span>
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

/** Confirms a return request was registered, sent to the customer. */
export async function sendReturnRequestedEmail(
  to: string,
  data: {
    customerName: string;
    returnNumber: string;
    orderNumber: string;
    items: ReturnEmailItem[];
  },
): Promise<SendResult> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Cererea ta de retur a fost înregistrată</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Bună, ${data.customerName}. Am primit cererea ta de retur <strong style="color:${BRAND.ink};">#${data.returnNumber}</strong>
      pentru comanda <strong style="color:${BRAND.ink};">#${data.orderNumber}</strong>. O vom analiza în cel mai scurt timp și revenim cu instrucțiuni.
    </p>
    ${returnItemsList(data.items)}
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/cont/retururi" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Vezi statusul returului</a>
    </div>`;
  return send(
    to,
    `Cerere retur înregistrată #${data.returnNumber} — ${BRAND.name}`,
    emailShell("Cerere retur", body),
  );
}

/** Notifies the store operator that a new return request arrived. */
export async function sendReturnAdminEmail(
  adminEmail: string,
  data: {
    returnNumber: string;
    orderNumber: string;
    customerName: string;
    reason: string;
    items: ReturnEmailItem[];
  },
): Promise<SendResult> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;">Cerere retur nouă</h1>
    <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      <strong style="color:${BRAND.ink};">${data.customerName}</strong> a solicitat returul <strong style="color:${BRAND.ink};">#${data.returnNumber}</strong>
      pentru comanda <strong style="color:${BRAND.ink};">#${data.orderNumber}</strong>.<br />
      Motiv: <strong style="color:${BRAND.ink};">${data.reason}</strong>
    </p>
    ${returnItemsList(data.items)}
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/admin/retururi" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Gestionează returul</a>
    </div>`;
  return send(
    adminEmail,
    `Cerere retur nouă #${data.returnNumber} — ${BRAND.name}`,
    emailShell("Cerere retur nouă", body),
  );
}

/** Return approved — gives the customer parcel-shipping instructions. */
export async function sendReturnApprovedEmail(
  to: string,
  data: { customerName: string; returnNumber: string },
): Promise<SendResult> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Returul tău a fost aprobat</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Bună, ${data.customerName}. Cererea ta de retur <strong style="color:${BRAND.ink};">#${data.returnNumber}</strong> a fost aprobată.
      Te rugăm să expediezi coletul la adresa de mai jos, cu produsele ambalate în siguranță.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};border:1px dashed ${BRAND.gold};border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:18px 24px;font-family:Arial,sans-serif;font-size:14px;color:${BRAND.ink};line-height:1.6;">
        <span style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Adresă expediere colet</span><br />
        <strong>${RETURN_WAREHOUSE_ADDRESS}</strong>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};">
      După expediere, adaugă numărul AWB în contul tău pentru a putea urmări coletul. Rambursarea se procesează în maximum 14 zile de la primirea produselor.
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/cont/retururi" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Adaugă AWB retur</a>
    </div>`;
  return send(
    to,
    `Retur aprobat #${data.returnNumber} — ${BRAND.name}`,
    emailShell("Retur aprobat", body),
  );
}

/** Return rejected — explains why, sent to the customer. */
export async function sendReturnRejectedEmail(
  to: string,
  data: { customerName: string; returnNumber: string; reason?: string | null },
): Promise<SendResult> {
  const reasonBlock = data.reason?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
         <tr><td style="border-left:3px solid ${BRAND.gold};padding:8px 16px;font-family:Georgia,serif;font-style:italic;font-size:15px;color:${BRAND.ink};">„${data.reason.trim()}"</td></tr>
       </table>`
    : "";
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Actualizare cerere retur</h1>
    <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Bună, ${data.customerName}. Din păcate, cererea ta de retur <strong style="color:${BRAND.ink};">#${data.returnNumber}</strong> nu a putut fi aprobată.
    </p>
    ${reasonBlock}
    <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};">
      Pentru întrebări, răspunde la acest email și echipa noastră te va ajuta.
    </p>`;
  return send(
    to,
    `Actualizare retur #${data.returnNumber} — ${BRAND.name}`,
    emailShell("Actualizare retur", body),
  );
}

/** Refund confirmation, sent to the customer once the return is settled. */
export async function sendReturnRefundedEmail(
  to: string,
  data: {
    customerName: string;
    returnNumber: string;
    amount: number;
    currency?: string;
    method: "card" | "voucher";
    voucherCode?: string | null;
  },
): Promise<SendResult> {
  const currency = data.currency ?? "RON";
  const methodBlock =
    data.method === "voucher" && data.voucherCode
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:${BRAND.ink};border:1px solid ${BRAND.gold};border-radius:14px;">
           <tr><td style="padding:28px;text-align:center;">
             <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.gold};">Voucher retur</p>
             <p style="margin:14px 0 0;font-size:36px;color:${BRAND.paper};">${formatPrice(data.amount, currency)}</p>
             <p style="margin:14px 0 0;font-family:'Courier New',monospace;font-size:20px;letter-spacing:3px;color:${BRAND.gold};">${data.voucherCode}</p>
           </td></tr>
         </table>
         <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};text-align:center;">Introdu codul la finalizarea unei comenzi viitoare.</p>`
      : `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:16px;color:${BRAND.ink};">
           Am inițiat rambursarea de <strong>${formatPrice(data.amount, currency)}</strong> către cardul folosit la plată.
           Suma ar trebui să apară în cont în 5–10 zile lucrătoare.
         </p>`;
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Rambursare procesată</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Bună, ${data.customerName}. Returul tău <strong style="color:${BRAND.ink};">#${data.returnNumber}</strong> a fost finalizat.
    </p>
    ${methodBlock}`;
  return send(
    to,
    `Rambursare retur #${data.returnNumber} — ${BRAND.name}`,
    emailShell("Rambursare retur", body),
  );
}

// ----------------------------------------------------------------------------
//  Waitlist & pre-orders (Phase 9)
// ----------------------------------------------------------------------------

/** Confirmation that a customer joined the waitlist for an upcoming launch. */
export async function sendWaitlistConfirmation(
  to: string,
  data: { perfumeName: string; firstName?: string | null; productUrl?: string },
): Promise<SendResult> {
  const greeting = data.firstName ? `Bună, ${data.firstName}!` : "Bună!";
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Ești pe lista de așteptare</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      ${greeting} Te-am înscris pe lista de așteptare pentru <strong style="color:${BRAND.ink};">${data.perfumeName}</strong>.
      Vei fi printre primii anunțați în momentul lansării — stocurile la decanturile de nișă se epuizează rapid.
    </p>
    <div style="text-align:center;margin-top:12px;">
      <a href="${data.productUrl ?? `${APP_URL}/lansari`}" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Vezi lansările viitoare</a>
    </div>`;
  return send(
    to,
    `Ești pe lista de așteptare — ${data.perfumeName}`,
    emailShell("Listă de așteptare", body),
  );
}

/** Confirmation that a pre-order payment succeeded. */
export async function sendPreOrderConfirmation(
  to: string,
  data: {
    perfumeName: string;
    sizeML: number;
    quantity: number;
    expectedDate?: Date | null;
  },
): Promise<SendResult> {
  const eta = data.expectedDate
    ? new Intl.DateTimeFormat("ro-RO", {
        month: "long",
        year: "numeric",
      }).format(data.expectedDate)
    : null;
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Precomandă confirmată</h1>
    <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Îți mulțumim! Am înregistrat precomanda ta pentru
      <strong style="color:${BRAND.ink};">${data.perfumeName}</strong> (${data.sizeML} ml × ${data.quantity}).
    </p>
    ${
      eta
        ? `<p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.ink};">Livrare estimată: <strong>${eta}</strong>. Te anunțăm imediat ce expediem.</p>`
        : `<p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.ink};">Te anunțăm imediat ce produsul ajunge în stoc și expediem comanda.</p>`
    }
    <div style="text-align:center;margin-top:12px;">
      <a href="${APP_URL}/cont/precomenzile-mele" style="display:inline-block;background:${BRAND.ink};color:${BRAND.gold};text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Vezi precomenzile mele</a>
    </div>`;
  return send(
    to,
    `Precomandă confirmată — ${data.perfumeName}`,
    emailShell("Precomandă confirmată", body),
  );
}

/** Preview of a monthly subscription-box curation, sent to the admin. */
export async function sendBoxCurationPreview(
  to: string,
  data: {
    month: string;
    items: { perfumeName: string; houseName: string; sizeML: number }[];
    curatorNote?: string | null;
  },
): Promise<SendResult> {
  const rows = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;">
          <strong style="font-size:15px;">${it.perfumeName}</strong><br />
          <span style="color:${BRAND.muted};font-size:13px;font-family:Arial,sans-serif;">${it.houseName} · ${it.sizeML} ml</span>
        </td>
      </tr>`,
    )
    .join("");
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;">Cutia lunii ${data.month}</h1>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;color:${BRAND.muted};">
      Previzualizarea conținutului curatoriat pentru abonații tăi.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${
      data.curatorNote
        ? `<div style="margin-top:20px;padding:16px;background:${BRAND.paper};border-left:3px solid ${BRAND.gold};">
             <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-style:italic;color:${BRAND.ink};">${data.curatorNote}</p>
           </div>`
        : ""
    }`;
  return send(
    to,
    `[Preview] Cutia lunii ${data.month} — ${BRAND.name}`,
    emailShell("Previzualizare cutie", body),
  );
}
