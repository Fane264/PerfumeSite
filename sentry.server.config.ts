// Sentry Node.js (server) SDK initialization. Loaded from `instrumentation.ts`
// during the `nodejs` runtime's `register()` hook.
import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: isProd ? 0.1 : 1,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
