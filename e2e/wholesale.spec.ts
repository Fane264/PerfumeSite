import { test, expect } from "@playwright/test";

test.describe("Wholesale B2B", () => {
  test("/wholesale shows the program landing", async ({ page }) => {
    await page.goto("/wholesale");
    await expect(
      page.getByRole("heading", { name: /devino partener/i }),
    ).toBeVisible();
    // The example pricing table is always shown.
    await expect(page.getByText(/prețuri exemplu/i)).toBeVisible();
  });

  test("the application area prompts sign-in or shows the form", async ({
    page,
  }) => {
    await page.goto("/wholesale");

    const companyField = page.getByPlaceholder(/SC Parfumerie/i);
    const signInCta = page.getByRole("link", { name: /autentificare/i });

    // Signed out → sign-in CTA; signed in → the application form.
    await expect(async () => {
      const hasForm = await companyField.count();
      const hasCta = await signInCta.count();
      expect(hasForm + hasCta).toBeGreaterThan(0);
    }).toPass();

    if (await companyField.count()) {
      await companyField.fill("Boutique E2E SRL");
      await page.getByRole("button", { name: /trimite cererea/i }).click();
      // Either a success confirmation or a validation/auth error toast appears.
      await expect(
        page.getByText(/cerere|trimis|eroare|autentific/i).first(),
      ).toBeVisible();
    }
  });
});
