# Decanturi Niche — Premium Niche Perfume Decants

Production e-commerce platform for niche-perfume **decants**. Next.js 14 (App
Router, TypeScript strict), Prisma + PostgreSQL, Clerk auth, Stripe payments,
Cloudinary media, Algolia search (with DB fallback), Resend email, Upstash rate
limiting and Sentry monitoring.

---

## 1. Prerequisites

- **Node.js 18+** (Node 20 recommended) and npm
- **PostgreSQL 14+** (Railway, Supabase, Neon, or local)
- Accounts for the integrated services:
  - [Clerk](https://clerk.com) — authentication
  - [Stripe](https://stripe.com) — payments
  - [Cloudinary](https://cloudinary.com) — image storage/CDN
  - [Resend](https://resend.com) — transactional email
  - [Algolia](https://algolia.com) — search _(optional; DB fallback otherwise)_
  - [Upstash](https://upstash.com) — Redis for rate limiting _(optional)_
  - [Sentry](https://sentry.io) — error monitoring _(optional)_
  - [Vercel](https://vercel.com) — hosting + cron
  - [Railway](https://railway.app) / [Supabase](https://supabase.com) — database

---

## 2. Local Development

```bash
# 1. Clone & install
git clone <repo-url> perfume-site
cd perfume-site
npm install                # runs `prisma generate` via postinstall

# 2. Configure environment
cp .env.example .env       # then fill in real values (see §3)

# 3. Set up the database
npx prisma migrate deploy  # or: npm run db:push   (schema sync without history)
npm run db:seed            # seed houses, families, notes, perfumes, variants

# 4. (optional) Index search
npx tsx scripts/reindex-algolia.ts

# 5. Run
npm run dev                # http://localhost:3000
```

Quality gates (run before every commit/deploy):

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run analyze     # ANALYZE=true next build — bundle report
```

---

## 3. Environment Variables

Copy `.env.example` → `.env`. **Required** services fail fast at startup if
missing (validated in [`lib/env.ts`](lib/env.ts)); optional integrations degrade
gracefully (the feature is disabled, the app keeps running).

| Variable | Where to get it | Required |
| --- | --- | --- |
| `DATABASE_URL` | Railway/Supabase → pooled connection | ✅ |
| `DIRECT_URL` | Railway/Supabase → direct (5432) connection | ✅ (migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys | ✅ |
| `CLERK_SECRET_KEY` | Clerk → API Keys | ✅ |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → Signing Secret | ✅ (webhook) |
| `STRIPE_SECRET_KEY` | Stripe → API keys | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks signing secret | ✅ (webhook) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary → Dashboard | for uploads |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary | for uploads |
| `RESEND_API_KEY` | Resend → API Keys | for email |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | your verified domain | for email |
| `RESEND_AUDIENCE_ID` | Resend → Audiences | newsletter |
| `ALGOLIA_APP_ID` / `ALGOLIA_ADMIN_API_KEY` / `ALGOLIA_INDEX_NAME` | Algolia → API Keys | optional |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` / `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Algolia → API Keys | optional |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash → Redis → REST | optional (rate limit) |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Sentry | optional (monitoring) |
| `CRON_SECRET` | random string you generate | ✅ (cron jobs) |
| `ADMIN_EMAIL` | your inbox | low-stock alerts |
| `NEXT_PUBLIC_APP_URL` | your canonical site URL | ✅ |

---

## 4. Database Setup

**Railway**

1. New Project → **Add PostgreSQL**.
2. Copy the connection string into `DATABASE_URL` (and `DIRECT_URL`; on Railway
   they are the same).
3. Apply schema and seed:

```bash
npx prisma migrate deploy   # applies prisma/migrations
npx prisma db seed
```

> Phases 1–3 were developed with `prisma db push`. A migration history now lives
> in `prisma/migrations`; use `migrate deploy` in production. For a brand-new
> database with no history you may instead run `npx prisma db push` once to
> create all tables, then `db seed`.

---

## 5. Clerk Setup

1. Create an application, copy the publishable + secret keys.
2. **CRITICAL** — expose `public_metadata` to the session token:
   Dashboard → **Configure → Sessions → Customize session token**, add:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
3. Make the first admin: Dashboard → **Users → [user] → Metadata →
   Public metadata**:
   ```json
   { "role": "ADMIN" }
   ```
4. Add a webhook: **Webhooks → Add Endpoint** →
   `https://<domain>/api/webhooks/clerk` → events:
   `user.created`, `user.updated`, `user.deleted`. Copy the signing secret into
   `CLERK_WEBHOOK_SECRET`.

---

## 6. Stripe Setup

1. Products/prices are created on the fly per checkout session (no manual setup
   needed), or via seed.
2. Add a webhook: **Developers → Webhooks** →
   `https://<domain>/api/webhooks/stripe` → events:
   `checkout.session.completed`, `payment_intent.payment_failed`,
   `charge.refunded`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 7. Algolia Setup _(optional)_

The catalog renders Algolia InstantSearch only when public credentials are
present (`isAlgoliaConfigured`); otherwise it falls back to DB-backed search.

1. Create an app → index **`perfumes`** → copy App ID + keys.
2. Create sort replicas: `perfumes_price_asc`, `perfumes_price_desc`,
   `perfumes_newest`.
3. After seeding, index the catalog:
   ```bash
   npx tsx scripts/reindex-algolia.ts
   ```

---

## 8. Cloudinary Setup

1. Create an **unsigned** upload preset named `perfume-site`.
2. Set its folder to `perfume-site/products/`.
3. Put the cloud name + preset in the `NEXT_PUBLIC_CLOUDINARY_*` vars.

---

## 9. Vercel Deployment

1. Import the repo → Framework preset **Next.js**, root `/`.
2. Add every environment variable from §3 (including `CRON_SECRET`).
3. Deploy. `vercel.json` registers the cron jobs automatically:
   - `/api/cron/abandoned-cart` — hourly (`0 * * * *`)
   - `/api/cron/low-stock-alert` — daily 09:00 (`0 9 * * *`)

   Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; the routes also accept
   an `x-cron-secret` header for manual/external triggering.

---

## 10. Post-deploy Checklist

- [ ] Place a test order end-to-end (`4242…`)
- [ ] Verify the Clerk webhook fires on sign-up (user row created)
- [ ] Verify the Stripe webhook fires on payment (order persisted, stock deducted)
- [ ] Check email delivery (order confirmation, welcome)
- [ ] Verify Algolia search returns results (or DB fallback works)
- [ ] Test admin login + product creation
- [ ] Test rate limiting (hammer an endpoint → `429`)
- [ ] Verify Sentry catches an error (trigger a 404 / throw)
- [ ] Test the abandoned-cart cron:
  ```bash
  curl -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/cron/abandoned-cart
  ```
- [ ] Test the low-stock cron:
  ```bash
  curl -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/cron/low-stock-alert
  ```

---

## Architecture Notes

- **API envelope** — every route returns `{ data, error, meta? }`.
- **Config** — server code reads validated config from [`lib/env.ts`](lib/env.ts);
  client components reference `NEXT_PUBLIC_*` via `process.env` directly so Next
  can statically inline them.
- **Rate limiting** — IP sliding-window via Upstash; fails open if Redis is down.
- **Monitoring** — Sentry client/server/edge configs wired through
  `instrumentation.ts` and `instrumentation-client.ts`.
- **Soft-deletes** — coupons referenced by orders are deactivated, not deleted;
  review "reject" sets `isApproved: false`.
