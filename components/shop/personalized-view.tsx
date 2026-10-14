"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { recommendationsApi } from "@/lib/api-client";
import { fadeUp } from "@/lib/motion";
import { PerfumeCard } from "@/components/shop/perfume-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiPerfumeListItem } from "@/types";

export function PersonalizedView({ firstName }: { firstName: string }) {
  const t = useTranslations("forYou");
  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", "personal"],
    queryFn: recommendationsApi.personal,
  });

  return (
    <div className="container py-28 md:py-32">
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-12">
        <p className="text-xs uppercase tracking-luxe text-gold">{t("eyebrow")}</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-5xl">
          {t("title", { name: firstName })}
        </h1>
      </motion.div>

      {isLoading ? (
        <div className="space-y-12">
          {[0, 1, 2].map((i) => (
            <SectionSkeleton key={i} />
          ))}
        </div>
      ) : !data || !data.hasEnoughData ? (
        <EmptyState newArrivals={data?.newArrivals ?? []} />
      ) : (
        <div className="space-y-16">
          <Section
            title={t("basedOnPurchases")}
            href="/parfumuri"
            items={data.basedOnPurchases}
          />
          <Section
            title={t("topInFamilies")}
            href="/parfumuri"
            items={data.topInYourFamilies}
          />
          <Section
            title={t("housesYouLike")}
            href="/case"
            items={data.housesYouLike}
          />
          <Section
            title={t("newForYou")}
            href="/parfumuri?sort=newest"
            items={data.newArrivals}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: ApiPerfumeListItem[];
}) {
  const tc = useTranslations("common");
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-serif text-2xl font-light text-cream md:text-3xl">
          {title}
        </h2>
        <Link
          href={href}
          className="flex items-center gap-1.5 whitespace-nowrap text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
        >
          {tc("viewAll")} <ArrowRight className="size-4" />
        </Link>
      </div>
      {/* Horizontal scroll carousel with snap. */}
      <div className="-mx-2 flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 pb-4 scrollbar-luxe">
        {items.map((perfume) => (
          <div
            key={perfume.id}
            className="w-56 shrink-0 snap-start sm:w-64"
          >
            <PerfumeCard perfume={perfume} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="flex gap-6 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-56 shrink-0 sm:w-64">
            <Skeleton className="aspect-[3/4] w-full" />
            <Skeleton className="mt-4 h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ newArrivals }: { newArrivals: ApiPerfumeListItem[] }) {
  const t = useTranslations("forYou");
  return (
    <div>
      <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-gold/40 text-gold">
          <Sparkles className="size-7" />
        </div>
        <p className="font-serif text-2xl font-light text-cream">
          {t("emptyTitle")}
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("emptyDesc")}
        </p>
        <Link
          href="/quiz"
          className="mt-2 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          {t("takeQuiz")}
        </Link>
      </div>

      {newArrivals.length > 0 && (
        <div className="mt-16">
          <Section
            title={t("newInCollection")}
            href="/parfumuri?sort=newest"
            items={newArrivals}
          />
        </div>
      )}
    </div>
  );
}
