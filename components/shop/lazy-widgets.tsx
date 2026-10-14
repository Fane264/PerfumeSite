"use client";

import dynamic from "next/dynamic";

// Client-only, below-the-fold widgets. Deferred with `ssr: false` so they don't
// add to the server-rendered HTML or block first paint — they hydrate after the
// initial bundle. Each is already a client component.

export const CompareBar = dynamic(
  () => import("./compare-bar").then((m) => m.CompareBar),
  { ssr: false },
);

export const FlashSaleBanner = dynamic(
  () => import("./FlashSaleBanner").then((m) => m.FlashSaleBanner),
  { ssr: false },
);

export const MobileNav = dynamic(
  () => import("./mobile-nav").then((m) => m.MobileNav),
  { ssr: false },
);

export const CookieBanner = dynamic(
  () => import("./CookieBanner").then((m) => m.CookieBanner),
  { ssr: false },
);
