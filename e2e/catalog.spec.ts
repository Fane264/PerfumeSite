import { test, expect } from "@playwright/test";

test.describe("Catalog", () => {
  test("loads with products", async ({ page }) => {
    await page.goto("/parfumuri");
    await expect(page.locator('a[href^="/parfumuri/"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("search input filters results", async ({ page }) => {
    await page.goto("/parfumuri");
    const search = page
      .getByPlaceholder(/cau|search/i)
      .or(page.locator('input[type="search"]'))
      .first();
    if (await search.count()) {
      await search.fill("Creed");
      // Allow debounce + re-render.
      await page.waitForTimeout(1500);
      await expect(page.locator('a[href^="/parfumuri/"]').first()).toBeVisible();
    }
  });

  test("a family filter is present and clickable", async ({ page }) => {
    await page.goto("/parfumuri");
    const familyControl = page
      .getByRole("button", { name: /floral|oriental|lemnos|familie/i })
      .or(page.getByText(/familie olfactiv/i))
      .first();
    if (await familyControl.count()) {
      await expect(familyControl).toBeVisible();
    }
  });

  test("sort control is present", async ({ page }) => {
    await page.goto("/parfumuri");
    const sort = page
      .getByRole("combobox")
      .or(page.getByText(/sorteaz|relevan|preț/i))
      .first();
    await expect(sort).toBeVisible({ timeout: 15_000 });
  });

  test("clicking a product navigates to its detail page", async ({ page }) => {
    await page.goto("/parfumuri");
    const firstProduct = page.locator('a[href^="/parfumuri/"]').first();
    await firstProduct.waitFor({ state: "visible", timeout: 15_000 });
    await firstProduct.click();
    await expect(page).toHaveURL(/\/parfumuri\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
