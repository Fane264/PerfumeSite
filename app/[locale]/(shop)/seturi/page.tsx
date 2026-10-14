import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getActiveBundles } from "@/lib/bundles";
import { BundlesView } from "@/components/shop/bundles-view";

export const metadata: Metadata = {
  title: "Seturi Curate — Discovery Sets",
  description:
    "Seturi de decanturi curate pentru fiecare ocazie, la prețuri cu economii față de cumpărarea individuală.",
  alternates: { canonical: "/seturi" },
};

export const revalidate = 300;

type RouteParams = { params: { locale: string } };

export default async function BundlesPage({ params }: RouteParams) {
  const [bundles, t] = await Promise.all([
    getActiveBundles(params.locale),
    getTranslations("sets"),
  ]);

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-luxe text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 font-serif text-4xl font-light text-cream md:text-6xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <BundlesView bundles={bundles} />
    </div>
  );
}
