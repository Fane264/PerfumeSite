// Sentry browser SDK initialization. In Sentry's Next.js SDK (v8+) this file is
// loaded via `instrumentation-client.ts`. Kept as a dedicated module so the
// client config lives alongside the server/edge configs.
import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // 10% of transactions in production, everything in development.
  tracesSampleRate: isProd ? 0.1 : 1,
  // Session Replay — production only, sampled lightly to control volume.
  replaysSessionSampleRate: isProd ? 0.05 : 0,
  replaysOnErrorSampleRate: isProd ? 1 : 0,
  integrations: isProd
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],
  // Silently disabled when no DSN is configured.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});

// Instrument App Router client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
