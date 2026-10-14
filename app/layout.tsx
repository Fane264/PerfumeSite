import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { CookieBanner } from "@/components/shop/lazy-widgets";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Decanturi Niche — Parfumuri de nișă în decanturi",
    template: "%s | Decanturi Niche",
  },
  description:
    "Decanturi din cele mai renumite case de parfumuri de nișă: Creed, Xerjoff, Amouage, Initio și multe altele. Testează parfumuri de lux la prețuri accesibile.",
  keywords: [
    "decanturi parfumuri",
    "parfumuri de nișă",
    "Creed",
    "Xerjoff",
    "Amouage",
    "Initio",
    "samples parfum",
  ],
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: appUrl,
    siteName: "Decanturi Niche",
  },
};

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  colorScheme: "dark",
};

const algoliaAppId =
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? process.env.ALGOLIA_APP_ID;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read the active locale from the header set by the next-intl middleware so
  // the `<html lang>` matches the URL without pulling messages into the root
  // layout — the locale-aware provider lives in app/[locale]/layout.tsx.
  const locale = headers().get("x-next-intl-locale") ?? "ro";

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#C9A84C",
          colorBackground: "#111111",
          colorInputBackground: "#1A1A1A",
          colorText: "#F5F0E8",
          colorTextSecondary: "#9A9088",
          colorInputText: "#F5F0E8",
          borderRadius: "2px",
        },
        elements: {
          // Social auth buttons — made visible against the dark background.
          socialButtonsBlockButton: {
            backgroundColor: "#1E1E1E",
            border: "1px solid rgba(245,240,232,0.25)",
            color: "#F5F0E8",
            "&:hover": {
              backgroundColor: "#2A2A2A",
              borderColor: "rgba(201,168,76,0.5)",
            },
          },
          socialButtonsBlockButtonText: {
            color: "#F5F0E8",
            fontWeight: "500",
          },
          socialButtonsBlockButtonArrow: {
            color: "#F5F0E8",
          },
          dividerLine: {
            backgroundColor: "rgba(245,240,232,0.15)",
          },
          dividerText: {
            color: "#9A9088",
          },
          card: {
            backgroundColor: "#111111",
            boxShadow: "0 0 0 1px rgba(201,168,76,0.15)",
          },
          formFieldLabel: {
            color: "#9A9088",
          },
          footerActionLink: {
            color: "#C9A84C",
          },
          footerPages: {
            color: "#9A9088",
          },
        },
      }}
    >
      <html lang={locale} suppressHydrationWarning>
        <head>
          <link
            rel="alternate"
            type="application/rss+xml"
            title="DecantLux Blog"
            href="/feed.xml"
          />
          <link
            rel="preconnect"
            href="https://res.cloudinary.com"
            crossOrigin="anonymous"
          />
          {algoliaAppId && (
            <>
              <link
                rel="preconnect"
                href={`https://${algoliaAppId}-dsn.algolia.net`}
                crossOrigin="anonymous"
              />
              <link
                rel="dns-prefetch"
                href={`https://${algoliaAppId}-dsn.algolia.net`}
              />
            </>
          )}
        </head>
        <body className={`${fontSans.variable} ${fontSerif.variable} font-sans`}>
          <Providers>{children}</Providers>
          <CookieBanner />
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
