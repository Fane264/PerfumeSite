import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with a non-empty title and header", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    await expect(page.getByRole("banner")).toBeVisible();
    // Brand mark in the header.
    await expect(page.getByRole("link", { name: "DÉCANT" }).first()).toBeVisible();
  });

  test("hero links to the catalog", async ({ page }) => {
    await page.goto("/");
    const catalogLinks = page.locator('a[href="/parfumuri"]');
    await expect(catalogLinks.first()).toBeVisible();
  });

  test("renders at least one product card", async ({ page }) => {
    await page.goto("/");
    const productLinks = page.locator('a[href^="/parfumuri/"]');
    await expect(productLinks.first()).toBeVisible({ timeout: 15_000 });
  });

  test("navbar navigates to the catalog", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/parfumuri"]').first().click();
    await expect(page).toHaveURL(/\/parfumuri/);
  });

  test("footer newsletter accepts an email", async ({ page }) => {
    await page.goto("/");
    const emailInput = page.locator('input[type="email"]').last();
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill("tester@example.com");
    await expect(emailInput).toHaveValue("tester@example.com");
  });
});
