import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { formatBlogDate, type BlogPost } from "@/lib/blog";

/**
 * Editorial post card — cover image with hover zoom, gold category badge, serif
 * title and a truncated excerpt. Server component (no client state).
 */
export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-video overflow-hidden bg-surface"
        aria-label={post.title}
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-serif text-sm text-muted-2">
            DÉCANT
          </div>
        )}
        <span className="absolute left-3 top-3 bg-gold px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-background">
          {post.category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <Link href={`/blog/${post.slug}`}>
          <h3 className="font-serif text-xl font-light leading-snug text-cream transition-colors group-hover:text-gold-light">
            {post.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {post.excerpt}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-2">
          <span>{formatBlogDate(post.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>{post.readingTime} min citire</span>
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
        >
          Citește mai mult <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
