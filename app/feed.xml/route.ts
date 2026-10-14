import { getAllPosts } from "@/lib/blog";
import { APP_URL } from "@/lib/constants";

export const runtime = "nodejs";
export const revalidate = 3600;

// Escape the five XML predefined entities so post titles/excerpts containing
// `&`, `<`, `>`, `"` or `'` never produce malformed feed markup.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// GET /feed.xml — RSS 2.0 feed of the blog ("Jurnalul Parfumurilor").
export async function GET(): Promise<Response> {
  const posts = await getAllPosts();

  const items = posts
    .map((post) => {
      const url = `${APP_URL}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <category>${escapeXml(post.category)}</category>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jurnalul Parfumurilor | DecantLux</title>
    <link>${APP_URL}/blog</link>
    <description>Ghiduri, recenzii și descoperiri din lumea parfumurilor de nișă</description>
    <language>ro</language>
    <atom:link href="${APP_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
