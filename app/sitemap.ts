import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { APP_URL } from "@/lib/constants";
import { getAllPosts } from "@/lib/blog";

export const revalidate = 3600;

// Dynamic sitemap: static routes + every active perfume, house, bundle and blog
// post, in both locales. RO has no prefix; EN is served under `/en`
// (localePrefix: "as-needed").
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [perfumes, houses, bundles, posts] = await Promise.all([
    db.perfume.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.perfumeHouse.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.bundle.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    getAllPosts(),
  ]);

  const now = new Date();
  const en = (path: string) => `${APP_URL}/en${path}`;

  const staticPaths: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1.0, freq: "daily" },
    { path: "/parfumuri", priority: 0.9, freq: "daily" },
    { path: "/case", priority: 0.7, freq: "weekly" },
    { path: "/seturi", priority: 0.7, freq: "weekly" },
    { path: "/lansari", priority: 0.7, freq: "weekly" },
    { path: "/wholesale", priority: 0.6, freq: "monthly" },
    { path: "/quiz", priority: 0.5, freq: "monthly" },
    { path: "/blog", priority: 0.7, freq: "weekly" },
    { path: "/asistent", priority: 0.6, freq: "monthly" },
    { path: "/cadou", priority: 0.6, freq: "monthly" },
    { path: "/abonament", priority: 0.6, freq: "monthly" },
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.flatMap((s) => [
    {
      url: `${APP_URL}${s.path}`,
      lastModified: now,
      changeFrequency: s.freq,
      priority: s.priority,
      alternates: { languages: { ro: `${APP_URL}${s.path}`, en: en(s.path) } },
    },
    {
      url: en(s.path),
      lastModified: now,
      changeFrequency: s.freq,
      priority: s.priority * 0.9,
    },
  ]);

  const perfumeRoutes: MetadataRoute.Sitemap = perfumes.flatMap((p) => [
    {
      url: `${APP_URL}/parfumuri/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: {
          ro: `${APP_URL}/parfumuri/${p.slug}`,
          en: en(`/parfumuri/${p.slug}`),
        },
      },
    },
    {
      url: en(`/parfumuri/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ]);

  const houseRoutes: MetadataRoute.Sitemap = houses.map((h) => ({
    url: `${APP_URL}/case/${h.slug}`,
    lastModified: h.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const bundleRoutes: MetadataRoute.Sitemap = bundles.map((b) => ({
    url: `${APP_URL}/seturi/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.flatMap((post) => [
    {
      url: `${APP_URL}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: en(`/blog/${post.slug}`),
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]);

  return [
    ...staticRoutes,
    ...perfumeRoutes,
    ...houseRoutes,
    ...bundleRoutes,
    ...blogRoutes,
  ];
}
