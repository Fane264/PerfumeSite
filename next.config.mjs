import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// next-intl without locale-prefixed routing — points at the request config.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        // Placeholder imagery used by the seed script.
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        // Editorial placeholder imagery for hero / house covers.
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    // Allow Server Actions / larger payloads for product image uploads.
    serverActions: {
      bodySizeLimit: "8mb",
    },
    // Tree-shake barrel imports from heavy packages so each route only ships the
    // icons/components it actually uses.
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "recharts",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
  async headers() {
    return [
      {
        // Immutable, content-hashed build assets — cache for a year.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(withBundleAnalyzer(nextConfig)), {
  // Suppress the SDK's build-time logs.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only attempt source-map upload when an auth token is present.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Broaden client source-map upload coverage.
  widenClientFileUpload: true,
});
