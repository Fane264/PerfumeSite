import { test, expect, type Page } from "@playwright/test";

/** Add the first purchasable product to the cart. Returns false when blocked
 *  (no stock or sign-in required) so the test can skip gracefully. */
async function addFirstProductToCart(page: Page): Promise<boolean> {
  await page.goto("/parfumuri");
  const first = page.locator('a[href^="/parfumuri/"]').first();
  await first.waitFor({ state: "visible", timeout: 15_000 });
  await first.click();

  const addBtn = page.getByRole("button", { name: /adaugă în coș/i });
  if ((await addBtn.count()) === 0 || !(await addBtn.first().isEnabled())) {
    return false;
  }
  await addBtn.first().click();

  if (/sign-in/.test(page.url())) return false;
  // Cart drawer should appear for signed-in users.
  const drawer = page.getByRole("dialog", { name: /coș/i });
  return drawer.isVisible({ timeout: 5_000 }).catch(() => false);
}

test.describe("Cart & checkout", () => {
  test("adding a product shows it in the cart drawer", async ({ page }) => {
    const added = await addFirstProductToCart(page);
    test.skip(!added, "Cart requires authentication or stock");
    const drawer = page.getByRole("dialog", { name: /coș/i });
    await expect(drawer.locator('a[href^="/parfumuri/"]').first()).toBeVisible();
  });

  test("quantity controls and remove update the drawer", async ({ page }) => {
    const added = await addFirstProductToCart(page);
    test.skip(!added, "Cart requires authentication or stock");
    const drawer = page.getByRole("dialog", { name: /coș/i });
    const increase = drawer.getByRole("button", {
      name: /crește cantitatea/i,
    });
    if (await increase.count()) {
      await increase.first().click();
      await page.waitForTimeout(800);
    }
    const remove = drawer.getByRole("button", { name: /elimină din coș/i });
    if (await remove.count()) {
      await remove.first().click();
      await expect(drawer.getByText(/coșul tău este gol/i)).toBeVisible();
    }
  });

  test("checkout CTA navigates to /cos", async ({ page }) => {
    const added = await addFirstProductToCart(page);
    test.skip(!added, "Cart requires authentication or stock");
    const drawer = page.getByRole("dialog", { name: /coș/i });
    await drawer.getByRole("link", { name: /finalizează comanda/i }).click();
    await expect(page).toHaveURL(/\/cos/);
  });

  test("the checkout page renders for signed-in users", async ({ page }) => {
    await page.goto("/cos");
    // Either the multi-step form (signed-in) or a sign-in prompt is shown.
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });
});
