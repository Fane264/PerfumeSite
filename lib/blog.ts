import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

// ----------------------------------------------------------------------------
//  MDX-backed editorial blog.
//
//  Posts live as `.mdx` files under `content/blog/`, each with YAML frontmatter
//  (see `BlogPost`). Reading happens at build time / on the server via `fs`, so
//  this module is server-only. No external CMS, no database table — the files
//  are the source of truth and ship with the repo.
// ----------------------------------------------------------------------------

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: string;
  author: string;
  category: string;
  tags: string[];
  featured: boolean;
  relatedPerfumeSlugs: string[];
  readingTime: number;
  /** Raw MDX source (frontmatter stripped). */
  content: string;
}

/** Canonical blog categories, in display order (used for the listing tabs). */
export const BLOG_CATEGORIES = [
  "Ghiduri",
  "Recenzii",
  "Case de Parfumuri",
  "Note Olfactive",
] as const;

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/** Rough reading-time estimate from word count (~200 wpm), min 1 minute. */
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parsePost(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw);
  return {
    slug: asString(data.slug, slug),
    title: asString(data.title, slug),
    excerpt: asString(data.excerpt),
    coverImage: asString(data.coverImage),
    publishedAt: asString(data.publishedAt),
    author: asString(data.author, "Echipa DecantLux"),
    category: asString(data.category, "Ghiduri"),
    tags: asStringArray(data.tags),
    featured: data.featured === true,
    relatedPerfumeSlugs: asStringArray(data.relatedPerfumeSlugs),
    readingTime:
      typeof data.readingTime === "number" && data.readingTime > 0
        ? data.readingTime
        : estimateReadingTime(content),
    content,
  };
}

let cache: BlogPost[] | null = null;

async function loadPosts(): Promise<BlogPost[]> {
  if (cache && process.env.NODE_ENV === "production") return cache;

  let files: string[];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch {
    // No content directory yet — degrade to an empty blog rather than crash.
    return [];
  }

  const posts = await Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(BLOG_DIR, file), "utf8");
        return parsePost(file.replace(/\.mdx$/, ""), raw);
      }),
  );

  // Newest first.
  posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  cache = posts;
  return posts;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  return loadPosts();
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await loadPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostsByCategory(
  category: string,
): Promise<BlogPost[]> {
  const posts = await loadPosts();
  return posts.filter(
    (post) => post.category.toLowerCase() === category.toLowerCase(),
  );
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await loadPosts();
  const needle = tag.toLowerCase();
  return posts.filter((post) =>
    post.tags.some((t) => t.toLowerCase() === needle),
  );
}

export async function getFeaturedPosts(limit?: number): Promise<BlogPost[]> {
  const posts = await loadPosts();
  const featured = posts.filter((post) => post.featured);
  const pool = featured.length > 0 ? featured : posts;
  return typeof limit === "number" ? pool.slice(0, limit) : pool;
}

/** Other posts in the same category, excluding the given slug. */
export async function getRelatedPosts(
  post: BlogPost,
  limit = 2,
): Promise<BlogPost[]> {
  const posts = await loadPosts();
  return posts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, limit);
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Slugify a heading's text into an anchor id (matches the MDX heading ids). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Parse `##` and `###` headings out of MDX source for the table of contents. */
export function extractHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = content.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.*)$/.exec(line);
    if (match) {
      const text = match[2]!.trim().replace(/[#*`]+$/g, "").trim();
      headings.push({
        id: headingId(text),
        text,
        level: match[1]!.length === 2 ? 2 : 3,
      });
    }
  }
  return headings;
}

/** Format an ISO date as a Romanian long date, e.g. "1 iunie 2026". */
export function formatBlogDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
