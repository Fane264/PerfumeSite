import Stripe from "stripe";
import { env } from "./env";

// Stripe server client. The secret key is validated at startup via `env`; the
// client constructs eagerly and any network call uses the configured key.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  // Pin to the account's default API version (omitted) and enable TS helpers.
  typescript: true,
  appInfo: {
    name: "perfume-site",
  },
});

// Currencies Stripe treats as zero-decimal (amounts are whole units, not cents).
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

/**
 * Convert a human amount (e.g. `129.00` RON) into the integer Stripe expects in
 * its smallest currency unit (e.g. `12900` bani). Handles zero-decimal
 * currencies such as JPY.
 */
export function formatAmountForStripe(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/** Inverse of {@link formatAmountForStripe} — Stripe unit → human amount. */
export function formatAmountFromStripe(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return amount;
  }
  return amount / 100;
}

// ----------------------------------------------------------------------------
//  Subscription discovery box helpers (Phase 6)
// ----------------------------------------------------------------------------

/**
 * Open a Stripe Checkout Session in `subscription` mode for a discovery-box
 * plan. Olfactory preferences ride along in metadata so the
 * `customer.subscription.created` webhook can persist them.
 */
export async function createSubscriptionSession(
  userId: string,
  email: string,
  priceId: string,
  preferences: Record<string, unknown>,
  successUrl: string,
  cancelUrl: string,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: userId,
    metadata: {
      type: "subscription",
      userId,
      preferences: JSON.stringify(preferences ?? {}),
    },
    subscription_data: {
      metadata: {
        userId,
        preferences: JSON.stringify(preferences ?? {}),
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

/** Cancel a subscription at the end of the current billing period. */
export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

/** Resume a subscription scheduled to cancel at period end. */
export async function resumeSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
    pause_collection: "",
  });
}

/** Pause a subscription by voiding upcoming invoices (no charges, no boxes). */
export async function pauseSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  await stripe.subscriptions.update(stripeSubscriptionId, {
    pause_collection: { behavior: "void" },
  });
}
