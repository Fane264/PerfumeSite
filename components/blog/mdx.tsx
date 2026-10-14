import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Quote } from "lucide-react";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import { cn, formatPrice } from "@/lib/utils";
import { headingId } from "@/lib/blog";
import { getPerfumesBySlugs } from "@/lib/catalog";

// Accent colors per olfactory family, used by <NoteCard>.
const FAMILY_ACCENT: Record<string, string> = {
  floral: "#E8A0BF",
  oriental: "#C9A84C",
  woody: "#A8896B",
  fresh: "#6FB6B0",
  chypre: "#7FA86B",
  fougere: "#8A92C9",
  gourmand: "#C97F8A",
};

// ----------------------------------------------------------------------------
//  Custom components available inside blog MDX, plus dark-theme overrides for
//  the default prose elements (headings get stable ids so the ToC can link).
// ----------------------------------------------------------------------------

function slugFromChildren(children: React.ReactNode): string {
  const text = typeof children === "string" ? children : String(children ?? "");
  return headingId(text);
}

/** Inline product embed — `<PerfumeCallout slug="creed-aventus" />`. Async RSC. */
async function PerfumeCallout({ slug }: { slug: string }) {
  const [perfume] = await getPerfumesBySlugs([slug]);
  if (!perfume) return null;

  const priceLabel =
    perfume.priceRange.min === perfume.priceRange.max
      ? formatPrice(perfume.priceRange.min, perfume.priceRange.currency)
      : `De la ${formatPrice(perfume.priceRange.min, perfume.priceRange.currency)}`;

  return (
    <Link
      href={`/parfumuri/${perfume.slug}`}
      className="group my-8 flex items-center gap-5 overflow-hidden border border-border bg-surface no-underline transition-colors hover:border-gold/50"
    >
      <span className="relative aspect-square w-28 shrink-0 overflow-hidden bg-surface2 sm:w-32">
        {perfume.primaryImage ? (
          <Image
            src={perfume.primaryImage.url}
            alt={perfume.name}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col py-4 pr-5">
        <span className="text-xs font-medium uppercase tracking-widest text-gold">
          {perfume.house.name}
        </span>
        <span className="mt-1 font-serif text-lg font-light leading-tight text-cream">
          {perfume.name}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">{priceLabel}</span>
      </span>
      <span className="mr-5 flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-background transition-transform group-hover:translate-x-0.5">
        <ArrowUpRight className="size-5" />
      </span>
    </Link>
  );
}

const FAMILY_LABELS: Record<string, string> = {
  floral: "Floral",
  oriental: "Oriental",
  woody: "Lemnos",
  fresh: "Proaspăt",
  chypre: "Chypre",
  fougere: "Fougère",
  gourmand: "Gourmand",
};

/** Styled note explanation — `<NoteCard note="Oud" description="…" family="oriental" />`. */
function NoteCard({
  note,
  description,
  family,
}: {
  note: string;
  description: string;
  family?: string;
}) {
  const accent = (family && FAMILY_ACCENT[family]) || "#C9A84C";
  return (
    <span className="my-6 flex gap-4 border border-border bg-surface p-5">
      <span
        className="mt-1 h-12 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <span className="flex flex-col">
        <span className="flex items-baseline gap-2">
          <span className="font-serif text-lg text-cream">{note}</span>
          {family && (
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: accent }}
            >
              {FAMILY_LABELS[family] ?? family}
            </span>
          )}
        </span>
        <span className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </span>
  );
}

/** Luxury pull quote — `<QuoteBlock author="Roja Dove">…</QuoteBlock>`. */
function QuoteBlock({
  author,
  children,
}: {
  author?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-10 border-l-2 border-gold pl-6">
      <Quote className="mb-3 size-6 text-gold/60" aria-hidden />
      <blockquote className="font-serif text-2xl font-light not-italic leading-snug text-cream">
        {children}
      </blockquote>
      {author && (
        <figcaption className="mt-3 text-sm uppercase tracking-widest text-gold">
          — {author}
        </figcaption>
      )}
    </figure>
  );
}

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;

export const mdxComponents: MDXRemoteProps["components"] = {
  h2: ({ children, ...props }: HeadingProps) => (
    <h2
      id={slugFromChildren(children)}
      className="scroll-mt-28 font-serif text-3xl font-light text-cream"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HeadingProps) => (
    <h3
      id={slugFromChildren(children)}
      className="scroll-mt-28 font-serif text-2xl font-light text-gold-light"
      {...props}
    >
      {children}
    </h3>
  ),
  a: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href && href.startsWith("/")) {
      return (
        <Link href={href} className="text-gold underline-offset-4 hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold underline-offset-4 hover:underline"
        {...props}
      >
        {children}
      </a>
    );
  },
  PerfumeCallout,
  NoteCard,
  QuoteBlock,
};

/** Tailwind Typography prose classes tuned to the luxury dark theme. */
export const PROSE_CLASS = cn(
  "prose prose-invert max-w-none",
  "prose-headings:font-serif prose-headings:font-light",
  "prose-p:text-cream/80 prose-p:leading-relaxed",
  "prose-strong:text-cream prose-li:text-cream/80",
  "prose-a:text-gold prose-a:no-underline hover:prose-a:underline",
  "prose-blockquote:border-gold prose-blockquote:text-cream",
  "prose-code:text-gold prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:bg-surface prose-pre:border prose-pre:border-border",
  "prose-img:rounded-none",
);
