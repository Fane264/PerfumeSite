import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/shop/reveal";
import type { ApiHouseDetail } from "@/types";

export function FeaturedHouseSection({ house }: { house: ApiHouseDetail }) {
  const t = useTranslations("home");
  const cover =
    house.coverImageUrl ??
    "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1920&auto=format&fit=crop";

  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[560px]">
        <Image
          src={cover}
          alt={house.name}
          fill
          sizes="100vw"
          className="object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />

        <div className="container relative flex min-h-[560px] items-center">
          <Reveal className="max-w-xl border-l border-gold/40 py-12 pl-8">
            <p className="mb-4 text-xs uppercase tracking-luxe text-gold">
              {t("featuredHouseEyebrow")}
            </p>
            <h2 className="font-serif text-5xl font-light text-cream md:text-6xl">
              {house.name}
            </h2>
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-sm border border-border px-3 py-1 uppercase tracking-wide">
                {house.country}
              </span>
              {house.foundedYear && (
                <span className="rounded-sm border border-border px-3 py-1">
                  {t("since", { year: house.foundedYear })}
                </span>
              )}
            </div>
            {house.description && (
              <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
                {house.description}
              </p>
            )}
            <Link
              href={`/case/${house.slug}`}
              className="mt-8 inline-flex items-center gap-2 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
            >
              {t("discoverHouse", { name: house.name })}{" "}
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
