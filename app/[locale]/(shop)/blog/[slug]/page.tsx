import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Clock } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  extractHeadings,
  formatBlogDate,
} from "@/lib/blog";
import { getPerfumesBySlugs } from "@/lib/catalog";
import { APP_URL } from "@/lib/constants";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { mdxComponents, PROSE_CLASS } from "@/components/blog/mdx";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { ShareButtons } from "@/components/blog/share-buttons";
import { PostCard } from "@/components/blog/post-card";
import { PerfumeCard } from "@/components/shop/perfume-card";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 3600;

type RouteParams = { params: { slug: string } };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Articol negăsit" };

  const canonical = `/blog/${post.slug}`;
  return {
    title: `${post.title} | Blog DecantLux`,
    description: post.excerpt,
    authors: [{ name: post.author }],
    keywords: post.tags,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: canonical,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      ...(post.coverImage
        ? { images: [{ url: post.coverImage, alt: post.title }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: RouteParams) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const headings = extractHeadings(post.content);
  const [relatedProducts, relatedPosts] = await Promise.all([
    getPerfumesBySlugs(post.relatedPerfumeSlugs),
    getRelatedPosts(post),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? `${APP_URL}${post.coverImage}` : undefined,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: "DecantLux" },
    publisher: {
      "@type": "Organization",
      name: "DecantLux",
      url: APP_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${APP_URL}/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <article className="pb-24">
      <JsonLd data={jsonLd} />

      {/* Cover */}
      <header className="relative flex min-h-[60vh] items-end overflow-hidden">
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="container relative pb-12 pt-32">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <Link href="/" className="hover:text-gold">
              Acasă
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/blog" className="hover:text-gold">
              Blog
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-cream">{post.category}</span>
          </nav>
          <span className="bg-gold px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-background">
            {post.category}
          </span>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-light leading-tight text-cream md:text-6xl">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="text-cream">{post.author}</span>
            <span aria-hidden>·</span>
            <span>{formatBlogDate(post.publishedAt)}</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {post.readingTime} min citire
            </span>
          </div>
        </div>
      </header>

      <div className="container mt-14 grid gap-12 lg:grid-cols-[1fr_260px]">
        {/* Article body */}
        <div className="min-w-0">
          <div className={PROSE_CLASS}>
            <MDXRemote source={post.content} components={mdxComponents} />
          </div>

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8">
            <ShareButtons slug={post.slug} title={post.title} />
          </div>
        </div>

        {/* Sticky ToC */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <TableOfContents headings={headings} />
          </div>
        </aside>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="container mt-20 border-t border-border pt-14">
          <p className="mb-3 text-xs uppercase tracking-luxe text-gold">
            Din articol
          </p>
          <h2 className="mb-10 font-serif text-3xl font-light text-cream">
            Cumpără decanturile menționate
          </h2>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.slice(0, 3).map((perfume) => (
              <PerfumeCard key={perfume.id} perfume={perfume} />
            ))}
          </div>
        </section>
      )}

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="container mt-20 border-t border-border pt-14">
          <p className="mb-3 text-xs uppercase tracking-luxe text-gold">
            Continuă lectura
          </p>
          <h2 className="mb-10 font-serif text-3xl font-light text-cream">
            Articole similare
          </h2>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {relatedPosts.map((related) => (
              <PostCard key={related.slug} post={related} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
