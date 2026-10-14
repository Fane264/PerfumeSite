import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { withRatings } from "@/lib/catalog";
import { getLocalizedField } from "@/lib/i18n-content";
import { houseWithPerfumesArgs } from "@/types";
import { ProductGrid } from "@/components/shop/product-grid";
import { Reveal } from "@/components/shop/reveal";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";

export const revalidate = 120;

type RouteParams = { params: { slug: string; locale: string } };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const house = await db.perfumeHouse.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      description: true,
      descriptionEn: true,
      coverImageUrl: true,
    },
  });
  if (!house) return { title: "Casă negăsită" };
  const isEn = params.locale === "en";
  const title = isEn
    ? `${house.name} — niche decants`
    : `${house.name} — decanturi de nișă`;
  const description =
    getLocalizedField(house, "description", params.locale) ||
    (isEn
      ? `Decants from the ${house.name} perfume house.`
      : `Decanturi din parfumurile casei ${house.name}.`);
  const canonical = `/case/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      ...(house.coverImageUrl
        ? { images: [{ url: house.coverImageUrl, width: 1200, height: 630 }] }
        : {}),
    },
  };
}

export default async function HousePage({ params }: RouteParams) {
  const { locale } = params;
  const house = await db.perfumeHouse.findUnique({
    where: { slug: params.slug },
    ...houseWithPerfumesArgs,
  });
  if (!house || !house.isActive) notFound();

  const t = await getTranslations("houses");
  const tNav = await getTranslations("nav");

  const perfumes = await withRatings(house.perfumes);
  const iconic = perfumes.find((p) => p.isFeatured) ?? perfumes[0];
  const cover =
    house.coverImageUrl ??
    "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1920&auto=format&fit=crop";

  const description = getLocalizedField(house, "description", locale);
  const story = getLocalizedField(house, "story", locale);
  const country = getLocalizedField(house, "country", locale);

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: tNav("home"), path: "/" },
          { name: tNav("houses"), path: "/case" },
          { name: house.name, path: `/case/${house.slug}` },
        ]}
      />
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <Image
          src={cover}
          alt={house.name}
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="container relative flex h-full flex-col justify-end pb-12">
          <nav className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wide text-cream/70">
            <Link href="/" className="hover:text-gold">
              {tNav("home")}
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/case" className="hover:text-gold">
              {tNav("houses")}
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-gold">{house.name}</span>
          </nav>
          <h1 className="font-serif text-5xl font-light text-cream md:text-7xl">
            {house.name}
          </h1>
          <p className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">
            {country}
            {house.foundedYear ? ` · ${t("since", { year: house.foundedYear })}` : ""}
          </p>
        </div>
      </section>

      {/* Story */}
      {(description || story) && (
        <section className="container max-w-3xl py-16">
          {description && (
            <Reveal>
              <p className="font-serif text-2xl font-light leading-relaxed text-cream">
                {description}
              </p>
            </Reveal>
          )}
          {story && (
            <Reveal className="mt-6">
              <p className="leading-relaxed text-muted-foreground">
                {story}
              </p>
            </Reveal>
          )}
        </section>
      )}

      {/* Iconic spotlight */}
      {iconic && (
        <section className="container pb-8">
          <Reveal>
            <p className="mb-6 text-xs uppercase tracking-luxe text-gold">
              {t("iconicPerfume")}
            </p>
          </Reveal>
          <Link
            href={`/parfumuri/${iconic.slug}`}
            className="group grid items-center gap-8 border border-border bg-surface md:grid-cols-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto md:h-full md:min-h-[360px]">
              {iconic.primaryImage && (
                <Image
                  src={iconic.primaryImage.url}
                  alt={iconic.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-8 md:p-12">
              <p className="text-xs uppercase tracking-widest text-gold">
                {house.name}
              </p>
              <h2 className="mt-2 font-serif text-4xl font-light text-cream">
                {iconic.name}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("from")}{" "}
                {iconic.priceRange.min.toLocaleString(
                  locale === "en" ? "en-US" : "ro-RO",
                  {
                    style: "currency",
                    currency: iconic.priceRange.currency,
                  },
                )}
              </p>
              <span className="mt-6 inline-block border border-gold px-6 py-2.5 text-sm uppercase tracking-widest text-gold transition-colors group-hover:bg-gold group-hover:text-background">
                {t("discover")}
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Catalog */}
      <section className="container py-16">
        <Reveal>
          <h2 className="mb-10 font-serif text-3xl font-light text-cream">
            {t("collection", { name: house.name })}{" "}
            <span className="text-muted-foreground">({perfumes.length})</span>
          </h2>
        </Reveal>
        {perfumes.length === 0 ? (
          <p className="text-muted-foreground">
            {t("noActivePerfumes")}
          </p>
        ) : (
          <ProductGrid perfumes={perfumes} />
        )}
      </section>
    </div>
  );
}
