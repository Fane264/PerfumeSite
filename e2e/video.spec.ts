import { test, expect } from "@playwright/test";

test.describe("Product video", () => {
  test("the video tab opens a player when a product has videos", async ({
    page,
  }) => {
    // Open the first product from the catalog.
    await page.goto("/parfumuri");
    const firstCard = page.locator('a[href^="/parfumuri/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.waitForURL(/\/parfumuri\/.+/);

    const videoTab = page.getByRole("button", { name: /^video$/i });

    // Videos are seed-dependent. When the accordion tab exists, opening it
    // reveals the gallery (and clicking a thumbnail opens the modal player).
    if (await videoTab.count()) {
      await videoTab.first().click();
      await expect(page.getByTestId("product-video-gallery")).toBeVisible();
    } else {
      // Otherwise the product page itself must have rendered correctly.
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });
});
