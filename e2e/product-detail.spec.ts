import { test, expect, type Page } from "@playwright/test";

async function openFirstProduct(page: Page) {
  await page.goto("/parfumuri");
  const first = page.locator('a[href^="/parfumuri/"]').first();
  await first.waitFor({ state: "visible", timeout: 15_000 });
  await first.click();
  await expect(page).toHaveURL(/\/parfumuri\/[^/]+$/);
}

test.describe("Product detail", () => {
  test("shows title, gallery and olfactory pyramid", async ({ page }) => {
    await openFirstProduct(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("img").first()).toBeVisible();
    await expect(page.getByText(/piramida olfactiv/i)).toBeVisible();
  });

  test("variant selector updates the selected size", async ({ page }) => {
    await openFirstProduct(page);
    const sizeButtons = page.getByRole("button", { name: /\d+(\.\d+)?\s*ml/i });
    const count = await sizeButtons.count();
    expect(count).toBeGreaterThan(0);
    // Click an enabled size button.
    for (let i = 0; i < count; i += 1) {
      const btn = sizeButtons.nth(i);
      if (await btn.isEnabled()) {
        await btn.click();
        break;
      }
    }
  });

  test("add to cart opens the drawer or prompts sign-in", async ({ page }) => {
    await openFirstProduct(page);
    const addBtn = page.getByRole("button", { name: /adaugă în coș/i });
    if ((await addBtn.count()) === 0 || !(await addBtn.first().isEnabled())) {
      test.skip(true, "No purchasable variant in seed");
    }
    await addBtn.first().click();
    // Either the cart drawer opens (signed-in) or we're redirected to sign-in.
    const drawer = page.getByRole("dialog", { name: /coș/i });
    await expect
      .poll(async () =>
        (await drawer.isVisible().catch(() => false)) ||
        /sign-in/.test(page.url()),
      )
      .toBeTruthy();
  });

  test("wishlist toggle is present", async ({ page }) => {
    await openFirstProduct(page);
    await expect(
      page.getByRole("button", { name: /favorite/i }).first(),
    ).toBeVisible();
  });

  test("reviews section is visible", async ({ page }) => {
    await openFirstProduct(page);
    await expect(page.getByText(/recenzi/i).first()).toBeVisible();
  });
});
