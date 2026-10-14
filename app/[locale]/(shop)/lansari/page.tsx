import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";
import { LaunchesView, type LaunchCard } from "@/components/shop/launches-view";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Lansări Parfumuri Nișă 2026",
  description:
    "Descoperă următoarele lansări de parfumuri de nișă pe DecantLux. Înscrie-te pe lista de așteptare sau precomandă decanturile în avans.",
  alternates: {
    canonical: `${APP_URL}/lansari`,
    languages: { ro: `${APP_URL}/lansari`, en: `${APP_URL}/en/lansari` },
  },
  openGraph: {
    title: "Lansări Parfumuri Nișă 2026 | DecantLux",
    description:
      "Următoarele lansări de parfumuri de nișă — listă de așteptare și precomenzi.",
    url: `${APP_URL}/lansari`,
  },
};

export default async function LansariPage() {
  const [perfumes, user] = await Promise.all([
    db.perfume.findMany({
      where: { isComingSoon: true, isActive: true },
      orderBy: [{ launchDate: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        launchDate: true,
        waitlistOpen: true,
        preOrderOpen: true,
        house: { select: { name: true } },
        images: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          orderBy: { sizeML: "asc" },
          select: { id: true },
          take: 1,
        },
      },
    }),
    getCurrentUser(),
  ]);

  const t = await getTranslations("launches");

  const launches: LaunchCard[] = perfumes.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    houseName: p.house.name,
    imageUrl: p.images[0]?.url ?? null,
    launchDate: p.launchDate?.toISOString() ?? null,
    waitlistOpen: p.waitlistOpen,
    preOrderOpen: p.preOrderOpen,
    preOrderVariantId: p.variants[0]?.id ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">
          În curând
        </p>
        <h1 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <LaunchesView launches={launches} defaultEmail={user?.email ?? null} />
    </div>
  );
}
