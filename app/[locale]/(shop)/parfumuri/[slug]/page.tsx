import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getRatingSummary } from "@/lib/ratings";
import { withRatings } from "@/lib/catalog";
import { getLocalizedField } from "@/lib/i18n-content";
import { translateFamily } from "@/lib/olfactory-translations";
import { serializePerfumeDetail, serializeReview } from "@/lib/serializers";
import { buildPaginationMeta } from "@/lib/api-response";
import { perfumeDetailArgs, perfumeListArgs } from "@/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RatingStars } from "@/components/shop/rating-stars";
import { FamilyBadge } from "@/components/shop/family-badge";
import { ProductGallery } from "@/components/shop/product/product-gallery";
import { OlfactoryPyramid } from "@/components/shop/product/olfactory-pyramid";
import { BuyBox } from "@/components/shop/product/buy-box";
import { WaitlistButton } from "@/components/shop/WaitlistButton";
import { PreOrderButton } from "@/components/shop/PreOrderButton";
import { ProductVideoGallery } from "@/components/shop/product-video-gallery";
import { ReviewsSection } from "@/components/shop/product/reviews-section";
import { RelatedPerfumes } from "@/components/shop/product/related-perfumes";
import { ProductJsonLd } from "@/components/seo/product-json-ld";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { RecentlyViewed } from "@/components/shop/recently-viewed";
import { RecentlyViewedTracker } from "@/components/shop/recently-viewed-tracker";

export const revalidate = 60;

type RouteParams = { params: { slug: string; locale: string } };

const GENDER_LABEL = {
  ro: { MASCULINE: "Masculin", FEMININE: "Feminin", UNISEX: "Unisex" },
  en: { MASCULINE: "Masculine", FEMININE: "Feminine", UNISEX: "Unisex" },
} as const;

const CONCENTRATION_LABEL = {
  EDP: "Eau de Parfum",
  EDT: "Eau de Toilette",
  PARFUM: "Parfum",
  EAU_DE_COLOGNE: "Eau de Cologne",
  EXTRAIT: "Extrait de Parfum",
} as const;

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const perfume = await db.perfume.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      metaTitle: true,
      metaDescription: true,
      description: true,
      descriptionEn: true,
      house: { select: { name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
    },
  });
  if (!perfume) return { title: "Parfum negăsit" };
  const title = perfume.metaTitle ?? `${perfume.name} — ${perfume.house.name}`;
  const description =
    perfume.metaDescription ??
    getLocalizedField(perfume, "description", params.locale).slice(0, 160);
  const image = perfume.images[0]?.url;
  const canonical = `/parfumuri/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      ...(image
        ? { images: [{ url: image, width: 800, height: 600, alt: perfume.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PerfumeDetailPage({ params }: RouteParams) {
  const { locale } = params;
  const perfume = await db.perfume.findUnique({
    where: { slug: params.slug },
    ...perfumeDetailArgs,
  });
  if (!perfume || !perfume.isActive) notFound();

  const t = await getTranslations("productDetail");
  const tNav = await getTranslations("nav");

  const REVIEWS_LIMIT = 10;
  const [rating, reviewRows, reviewCount, related] = await Promise.all([
    getRatingSummary(perfume.id),
    db.review.findMany({
      where: { perfumeId: perfume.id, isApproved: true },
      include: {
        user: { select: { firstName: true, lastName: true, imageUrl: true } },
        images: { select: { id: true, url: true, altText: true } },
      },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: REVIEWS_LIMIT,
    }),
    db.review.count({ where: { perfumeId: perfume.id, isApproved: true } }),
    db.perfume.findMany({
      where: {
        isActive: true,
        id: { not: perfume.id },
        familyId: perfume.familyId,
      },
      ...perfumeListArgs,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const detail = serializePerfumeDetail(perfume, rating);
  // Localize DB-sourced text (fall back to RO when EN is missing).
  detail.description = getLocalizedField(perfume, "description", locale);
  detail.story = getLocalizedField(perfume, "story", locale) || null;
  detail.family = {
    ...detail.family,
    name: translateFamily(detail.family.slug, locale, detail.family.name),
  };
  detail.house = {
    ...detail.house,
    description: getLocalizedField(perfume.house, "description", locale) || null,
    story: getLocalizedField(perfume.house, "story", locale) || null,
  };
  const reviews = reviewRows.map(serializeReview);
  const relatedItems = await withRatings(related);
  const reviewsPagination = buildPaginationMeta(reviewCount, 1, REVIEWS_LIMIT);

  return (
    <div className="container py-28 md:py-32">
      <ProductJsonLd perfume={detail} />
      <BreadcrumbJsonLd
        items={[
          { name: tNav("home"), path: "/" },
          { name: tNav("perfumes"), path: "/parfumuri" },
          { name: detail.house.name, path: `/case/${detail.house.slug}` },
          { name: detail.name, path: `/parfumuri/${detail.slug}` },
        ]}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
      >
        <Link href="/" className="hover:text-gold">
          {tNav("home")}
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/parfumuri" className="hover:text-gold">
          {tNav("perfumes")}
        </Link>
        <ChevronRight className="size-3" />
        <Link href={`/case/${detail.house.slug}`} className="hover:text-gold">
          {detail.house.name}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-cream">{detail.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[55fr_45fr]">
        <ProductGallery images={detail.images} name={detail.name} />

        <div>
          <Link
            href={`/case/${detail.house.slug}`}
            className="text-sm font-medium uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
          >
            {detail.house.name}
          </Link>
          <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-5xl">
            {detail.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="rounded-sm border border-border px-2.5 py-1">
              {GENDER_LABEL[locale === "en" ? "en" : "ro"][detail.gender]}
            </span>
            <span className="rounded-sm border border-border px-2.5 py-1">
              {CONCENTRATION_LABEL[detail.concentration]}
            </span>
            {detail.launchYear && (
              <span className="rounded-sm border border-border px-2.5 py-1">
                {detail.launchYear}
              </span>
            )}
            <FamilyBadge family={detail.family} />
          </div>

          {detail.perfumer && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("perfumer")}:{" "}
              <span className="text-cream">{detail.perfumer}</span>
            </p>
          )}

          {rating.count > 0 && (
            <a
              href="#reviews"
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-gold"
            >
              <RatingStars value={rating.average} size={16} />
              <span>
                {rating.average.toFixed(1)} ({t("reviewsCount", { count: rating.count })})
              </span>
            </a>
          )}

          <div className="my-8 h-px bg-border" />

          {/* Launch lifecycle: pre-order > waitlist > normal purchase. */}
          {detail.preOrderOpen && detail.variants[0] ? (
            <PreOrderButton
              variantId={detail.variants[0].id}
              expectedDate={detail.launchDate}
            />
          ) : detail.waitlistOpen ? (
            <WaitlistButton perfumeId={detail.id} perfumeName={detail.name} />
          ) : (
            <BuyBox
              perfumeId={detail.id}
              slug={detail.slug}
              variants={detail.variants}
            />
          )}

          {/* Olfactory pyramid */}
          <div className="mt-10">
            <p className="mb-5 text-xs uppercase tracking-luxe text-gold">
              {t("olfactoryPyramid")}
            </p>
            <OlfactoryPyramid pyramid={detail.pyramid} />
          </div>

          {/* Accordion */}
          <Accordion type="single" collapsible className="mt-10">
            <AccordionItem value="description">
              <AccordionTrigger>{t("description")}</AccordionTrigger>
              <AccordionContent>{detail.description}</AccordionContent>
            </AccordionItem>
            {detail.story && (
              <AccordionItem value="story">
                <AccordionTrigger>{t("story")}</AccordionTrigger>
                <AccordionContent>{detail.story}</AccordionContent>
              </AccordionItem>
            )}
            {detail.videos.length > 0 && (
              <AccordionItem value="video">
                <AccordionTrigger>{t("video")}</AccordionTrigger>
                <AccordionContent>
                  <ProductVideoGallery videos={detail.videos} />
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="shipping">
              <AccordionTrigger>{t("shipping")}</AccordionTrigger>
              <AccordionContent>{t("shippingText")}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="authenticity">
              <AccordionTrigger>{t("authenticity")}</AccordionTrigger>
              <AccordionContent>
                <span className="inline-flex items-center gap-2 text-gold">
                  <ShieldCheck className="size-4" />
                  {t("authenticityText")}
                </span>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <ReviewsSection
        perfumeId={detail.id}
        initialReviews={reviews}
        initialRating={rating}
        initialPagination={{
          page: 1,
          hasNextPage: reviewsPagination.hasNextPage,
        }}
      />

      <RelatedPerfumes perfumes={relatedItems} />

      <RecentlyViewed excludeSlug={detail.slug} />
      <RecentlyViewedTracker slug={detail.slug} />
    </div>
  );
}
