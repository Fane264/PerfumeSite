import { z } from "zod";

// ----------------------------------------------------------------------------
//  Centralized, validated environment access.
//
//  Importing `env` from this module (instead of reaching for `process.env`)
//  gives every server-side consumer a typed, validated view of configuration.
//  Missing or malformed *required* variables fail fast at startup with a clear
//  message rather than surfacing as obscure runtime errors deep in a request.
//
//  Design notes:
//   - The object is built by listing each key explicitly so Next.js can inline
//     the `NEXT_PUBLIC_*` references at build time (a bare `process.env` spread
//     is not statically analyzable).
//   - Integrations that the app degrades gracefully without (Resend, Algolia,
//     Cloudinary, Upstash, Sentry) are `optional` — their absence disables the
//     feature instead of crashing the server. Only the genuinely load-bearing
//     services (database, Clerk, Stripe) are required.
//   - This module reads server secrets, so it must only be imported from
//     server code. Client components should reference the handful of
//     `NEXT_PUBLIC_*` values via `process.env` directly (Next inlines them).
// ----------------------------------------------------------------------------

// Optional URL that treats an empty string the same as unset, so a blank
// `FOO=` line in `.env` disables the integration instead of failing validation.
const optionalUrl = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().url().optional(),
);

const envSchema = z.object({
  // --- Database (required) --------------------------------------------------
  DATABASE_URL: z.string().url(),
  DIRECT_URL: optionalUrl,

  // --- Clerk (required) -----------------------------------------------------
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

  // --- Stripe (required) ----------------------------------------------------
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  // Subscription discovery-box price IDs (optional — plans disabled without).
  STRIPE_DISCOVERY_BOX_PRICE_ID: z.string().optional(),
  STRIPE_CONNOISSEUR_BOX_PRICE_ID: z.string().optional(),

  // --- Cloudinary (optional — uploads disabled without) ---------------------
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // --- Resend (optional — emails become logged no-ops without) --------------
  RESEND_API_KEY: z.string().optional(),
  RESEND_AUDIENCE_ID: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),

  // --- Algolia (optional — DB fallback search without) ----------------------
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_ADMIN_API_KEY: z.string().optional(),
  ALGOLIA_INDEX_NAME: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_INDEX_NAME: z.string().optional(),

  // --- Upstash Redis (optional — rate limiting disabled without) ------------
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // --- Sentry (optional — error monitoring disabled without) ----------------
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // --- Anthropic (optional — AI assistant disabled without) -----------------
  ANTHROPIC_API_KEY: z.string().optional(),

  // --- Company / invoicing (optional — placeholders on the PDF without) ------
  COMPANY_NAME: z.string().optional(),
  COMPANY_CUI: z.string().optional(),
  COMPANY_ADDRESS: z.string().optional(),
  COMPANY_IBAN: z.string().optional(),
  COMPANY_BANK: z.string().optional(),

  // --- FanCourier AWB (optional — AWB generation disabled without) ----------
  FANCOURIER_USERNAME: z.string().optional(),
  FANCOURIER_PASSWORD: z.string().optional(),
  FANCOURIER_CLIENT_ID: z.string().optional(),

  // --- Web push / VAPID (optional — push disabled without) ------------------
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  // --- Operational (cron jobs, alert recipients) ----------------------------
  CRON_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),

  // --- Application ----------------------------------------------------------
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD: z.string().optional(),
  NEXT_PUBLIC_SHIPPING_FEE: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_DISCOVERY_BOX_PRICE_ID: process.env.STRIPE_DISCOVERY_BOX_PRICE_ID,
  STRIPE_CONNOISSEUR_BOX_PRICE_ID: process.env.STRIPE_CONNOISSEUR_BOX_PRICE_ID,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET:
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_API_KEY: process.env.ALGOLIA_ADMIN_API_KEY,
  ALGOLIA_INDEX_NAME: process.env.ALGOLIA_INDEX_NAME,
  NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY:
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
  NEXT_PUBLIC_ALGOLIA_INDEX_NAME: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  COMPANY_NAME: process.env.COMPANY_NAME,
  COMPANY_CUI: process.env.COMPANY_CUI,
  COMPANY_ADDRESS: process.env.COMPANY_ADDRESS,
  COMPANY_IBAN: process.env.COMPANY_IBAN,
  COMPANY_BANK: process.env.COMPANY_BANK,
  FANCOURIER_USERNAME: process.env.FANCOURIER_USERNAME,
  FANCOURIER_PASSWORD: process.env.FANCOURIER_PASSWORD,
  FANCOURIER_CLIENT_ID: process.env.FANCOURIER_CLIENT_ID,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD:
    process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD,
  NEXT_PUBLIC_SHIPPING_FEE: process.env.NEXT_PUBLIC_SHIPPING_FEE,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // A single, readable failure beats a stack of undefined-deref errors later.
  throw new Error(
    `❌ Variabile de mediu invalide sau lipsă:\n${issues}\n\nVerifică fișierul .env (vezi .env.example).`,
  );
}

export const env: Env = parsed.data;
