import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getFeaturedPerfumes } from "@/lib/catalog";
import { serializeHouseDetail } from "@/lib/serializers";
import { ProductGrid } from "@/components/shop/product-grid";
import { SectionHeading, Reveal } from "@/components/shop/reveal";
import { HeroSection } from "@/components/shop/home/hero-section";
import { HouseMarquee } from "@/components/shop/home/house-marquee";
import { HowItWorksSection } from "@/components/shop/home/how-it-works-section";
import { OlfactoryWheelSection } from "@/components/shop/home/olfactory-wheel-section";
import { FeaturedHouseSection } from "@/components/shop/home/featured-house-section";
import { TestimonialsSection } from "@/components/shop/home/testimonials-section";
import { NewsletterSection } from "@/components/shop/home/newsletter-section";
import { UGCGallery } from "@/components/shop/home/UGCGallery";
import { RecentlyViewed } from "@/components/shop/recently-viewed";
import { ReferralBanner } from "@/components/shop/referral-banner";
import { PersonalizedTeaser } from "@/components/shop/personalized-teaser";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Decanturi Niche — Parfumuri de nișă în decanturi autentice",
  description:
    "Cumpără decanturi autentice din cele mai renumite case de parfumuri de nișă: Creed, Xerjoff, Amouage, Initio și multe altele. Testează parfumuri de lux la prețuri accesibile, cu livrare rapidă în România.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Decanturi Niche — Parfumuri de nișă în decanturi autentice",
    description:
      "Decanturi autentice din cele mai renumite case de parfumuri de nișă. Testează parfumuri de lux la prețuri accesibile.",
    type: "website",
    url: "/",
  },
};

export default async function HomePage() {
  const [featured, houses, families] = await Promise.all([
    getFeaturedPerfumes(6),
    db.perfumeHouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    db.olfactoryFamily.findMany({ orderBy: { name: "asc" } }),
  ]);

  const featuredHouse = houses[0];

  return (
    <>
      <Suspense fallback={null}>
        <ReferralBanner />
      </Suspense>

      <HeroSection />

      <HouseMarquee houses={houses.map((h) => h.name.toUpperCase())} />

      {/* Bestsellers */}
      <section className="container py-24">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Selecția caselor" title="Cele mai iubite" />
          <Reveal>
            <Link
              href="/parfumuri"
              className="hidden items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold sm:flex"
            >
              Vezi toate <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>

        {featured.length === 0 ? (
          <p className="mt-10 text-muted-foreground">
            Nu există încă parfumuri recomandate.
          </p>
        ) : (
          <ProductGrid perfumes={featured} className="mt-14" priorityCount={3} />
        )}

        <Reveal className="mt-12 text-center sm:hidden">
          <Link
            href="/parfumuri"
            className="inline-flex items-center gap-2 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold"
          >
            Vezi toate <ArrowRight className="size-4" />
          </Link>
        </Reveal>
      </section>

      <section className="container">
        <RecentlyViewed />
      </section>

      <PersonalizedTeaser />

      <HowItWorksSection />

      <OlfactoryWheelSection
        families={families.map((f) => ({
          name: f.name,
          slug: f.slug,
          colorHex: f.colorHex,
        }))}
      />

      {featuredHouse && (
        <FeaturedHouseSection house={serializeHouseDetail(featuredHouse)} />
      )}

      <TestimonialsSection />

      <UGCGallery />

      <NewsletterSection />
    </>
  );
}
