import { test, expect } from "@playwright/test";

test.describe("Waitlist & launches", () => {
  test("/lansari renders the launches page", async ({ page }) => {
    await page.goto("/lansari");
    await expect(
      page.getByRole("heading", { name: /lansări viitoare/i }),
    ).toBeVisible();
  });

  test("a waitlist signup can be submitted when a launch is open", async ({
    page,
  }) => {
    await page.goto("/lansari");

    const emailInput = page
      .getByPlaceholder(/adresa@email\.com/i)
      .first();

    // The page may be empty when no coming-soon products are seeded; only
    // exercise the form when a waitlist input is actually present.
    if (await emailInput.count()) {
      await emailInput.fill("waitlist-e2e@example.com");
      await page.getByRole("button", { name: /înscrie-mă/i }).first().click();
      await expect(page.getByText(/ești pe list|deja pe list/i)).toBeVisible();
    } else {
      await expect(
        page.getByText(/nu există lansări programate/i),
      ).toBeVisible();
    }
  });
});
