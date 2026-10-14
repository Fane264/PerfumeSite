import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllPosts, formatBlogDate, BLOG_CATEGORIES } from "@/lib/blog";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { PostCard } from "@/components/blog/post-card";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog | DecantLux — Parfumuri de Nișă",
  description:
    "Jurnalul parfumurilor: ghiduri olfactive, recenzii de parfumuri de nișă, povești despre casele de parfumerie și note rare. Descoperă cum să alegi decantul perfect.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Jurnalul parfumurilor | DecantLux",
    description:
      "Ghiduri, recenzii și povești din lumea parfumurilor de nișă.",
    type: "website",
    url: "/blog",
  },
};

type SearchParams = { searchParams: { category?: string } };

export default async function BlogPage({ searchParams }: SearchParams) {
  const posts = await getAllPosts();
  const t = await getTranslations("blog");
  const activeCategory = searchParams.category;

  const featured = posts.find((p) => p.featured) ?? posts[0];
  const filtered = activeCategory
    ? posts.filter(
        (p) => p.category.toLowerCase() === activeCategory.toLowerCase(),
      )
    : posts.filter((p) => p.slug !== featured?.slug);

  return (
    <div className="container py-28 md:py-32">
      {/* Hero */}
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs uppercase tracking-luxe text-gold">
          {t("journal")}
        </p>
        <h1 className="font-serif text-4xl font-light text-cream md:text-6xl">
          {t("heading")}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* Featured */}
      {featured && !activeCategory && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mb-16 grid gap-8 border border-border bg-surface md:grid-cols-2"
        >
          <div className="relative aspect-video overflow-hidden md:aspect-auto">
            {featured.coverImage && (
              <Image
                src={featured.coverImage}
                alt={featured.title}
                fill
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            )}
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12">
            <span className="text-xs font-medium uppercase tracking-widest text-gold">
              {featured.category} · {t("featured")}
            </span>
            <h2 className="mt-3 font-serif text-3xl font-light leading-tight text-cream transition-colors group-hover:text-gold-light md:text-4xl">
              {featured.title}
            </h2>
            <p className="mt-4 text-muted-foreground">{featured.excerpt}</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-2">
              <span>{formatBlogDate(featured.publishedAt)}</span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> {featured.readingTime} min
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm uppercase tracking-widest text-gold">
              {t("readArticle")} <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>
      )}

      {/* Category tabs */}
      <nav className="mb-12 flex flex-wrap gap-2 border-b border-border pb-4">
        <CategoryTab label={t("filterAll")} href="/blog" active={!activeCategory} />
        {BLOG_CATEGORIES.map((category) => (
          <CategoryTab
            key={category}
            label={category}
            href={`/blog?category=${encodeURIComponent(category)}`}
            active={activeCategory?.toLowerCase() === category.toLowerCase()}
          />
        ))}
      </nav>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-muted-foreground">
          {t("emptyCategory")}
        </p>
      )}
    </div>
  );
}

function CategoryTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border px-4 py-2 text-xs uppercase tracking-widest transition-colors",
        active
          ? "border-gold bg-gold text-background"
          : "border-border text-muted-foreground hover:border-gold/40 hover:text-cream",
      )}
    >
      {label}
    </Link>
  );
}
