import { test, expect } from "@playwright/test";

test.describe("Search autocomplete", () => {
  test("opening search reveals the autocomplete panel", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await page.getByRole("button", { name: /caută parfumuri/i }).first().click();

    // The dialog with the search input appears.
    const input = page.getByRole("textbox", { name: /caută/i });
    await expect(input).toBeVisible();
  });

  test("typing a query then Enter navigates to the catalog", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await page.getByRole("button", { name: /caută parfumuri/i }).first().click();
    const input = page.getByRole("textbox", { name: /caută/i });
    await input.fill("Creed");
    await input.press("Enter");

    await expect
      .poll(() => new URL(page.url()).pathname + new URL(page.url()).search)
      .toContain("/parfumuri");
    await expect.poll(() => new URL(page.url()).search).toContain("Creed");
  });
});
