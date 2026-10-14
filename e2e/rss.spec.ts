import { test, expect } from "@playwright/test";

test.describe("RSS feed", () => {
  test("/feed.xml returns valid RSS", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.status()).toBe(200);

    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toContain("xml");

    const body = await res.text();
    expect(body).toContain("<rss");
    expect(body).toContain("<channel>");
    expect(body).toContain("Jurnalul Parfumurilor");
    // The seeded blog has at least one MDX post → at least one <item>.
    expect(body).toContain("<item>");
  });

  test("the homepage advertises the feed", async ({ page }) => {
    await page.goto("/");
    const feedLink = page.locator('link[type="application/rss+xml"]');
    await expect(feedLink).toHaveCount(1);
  });
});
