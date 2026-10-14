import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { isAlgoliaConfigured } from "@/lib/algolia-search";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { AlgoliaCatalog } from "@/components/shop/catalog/algolia-catalog";
import { PullToRefreshHint } from "@/components/shop/pull-to-refresh-hint";

export const metadata: Metadata = {
  title: "Parfumuri de nișă",
  description:
    "Explorează colecția de decanturi din cele mai renumite case de parfumuri de nișă. Caută în timp real și filtrează după casă, familie olfactivă, note, preț și disponibilitate.",
  alternates: { canonical: "/parfumuri" },
};

export const revalidate = 300;

export default async function ParfumuriPage() {
  // Real-time Algolia InstantSearch is the primary experience. When Algolia
  // credentials are absent (local/dev), fall back to the DB-backed catalog so
  // the storefront stays fully functional.
  if (isAlgoliaConfigured) {
    return (
      <>
        <PullToRefreshHint />
        <Suspense>
          <AlgoliaCatalog />
        </Suspense>
      </>
    );
  }

  const [houses, families, notes] = await Promise.all([
    db.perfumeHouse.findMany({
      where: { isActive: true },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    db.olfactoryFamily.findMany({
      select: { name: true, slug: true, colorHex: true },
      orderBy: { name: "asc" },
    }),
    db.olfactoryNote.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
      take: 60,
    }),
  ]);

  return (
    <>
      <PullToRefreshHint />
      <Suspense>
        <CatalogView options={{ houses, families, notes }} />
      </Suspense>
    </>
  );
}
