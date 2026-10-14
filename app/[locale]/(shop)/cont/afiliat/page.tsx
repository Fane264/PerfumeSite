import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { AffiliateDashboard } from "@/components/shop/affiliate/affiliate-dashboard";

export const metadata: Metadata = { title: "Programul meu de afiliat" };

export default async function ContAfiliatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=/cont/afiliat");

  const t = await getTranslations("affiliate");
  const tAccount = await getTranslations("account");

  return (
    <div className="container py-28 md:py-32">
      <nav className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Link href="/cont" className="hover:text-gold">
          {tAccount("breadcrumb")}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-cream">{t("breadcrumb")}</span>
      </nav>
      <h1 className="mb-8 font-serif text-4xl font-light text-cream md:text-5xl">
        {t("title")}
      </h1>
      <AffiliateDashboard />
    </div>
  );
}
