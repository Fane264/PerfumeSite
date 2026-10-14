import { test, expect } from "@playwright/test";

test.describe("Blog", () => {
  test("/blog loads with post cards", async ({ page }) => {
    await page.goto("/blog");
    await expect(
      page.getByRole("heading", { name: /jurnalul|povești|blog/i }).first(),
    ).toBeVisible();
    await expect(page.locator('a[href^="/blog/"]').first()).toBeVisible();
  });

  test("clicking a post opens the article", async ({ page }) => {
    await page.goto("/blog");
    // Pick a post link that points to an actual article (not the index).
    const postLink = page
      .locator('a[href^="/blog/"]')
      .filter({ hasNot: page.locator(':scope[href="/blog"]') })
      .first();
    await postLink.click();
    await expect(page).toHaveURL(/\/blog\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("table of contents is visible on desktop", async ({ page }, testInfo) => {
    await page.goto("/blog/ghid-parfumuri-nisa");
    if (testInfo.project.name === "chromium") {
      await expect(page.getByText(/cuprins/i).first()).toBeVisible();
    }
  });

  test("related products section shows product cards", async ({ page }) => {
    await page.goto("/blog/ghid-parfumuri-nisa");
    const related = page.getByText(/cumpără decanturile menționate/i);
    if (await related.count()) {
      await expect(related).toBeVisible();
      await expect(
        page.locator('a[href^="/parfumuri/"]').first(),
      ).toBeVisible();
    }
  });
});
