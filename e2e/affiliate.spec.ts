import { test, expect } from "@playwright/test";

test.describe("Affiliate program", () => {
  test("/afiliat shows the program landing", async ({ page }) => {
    await page.goto("/afiliat");
    // The landing pitches the program; an apply form or CTA is present.
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("an ?aff= link sets the attribution cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/?aff=AFF-TEST123");
    // Middleware captures the first-touch affiliate code into a 30-day cookie.
    await expect
      .poll(async () => {
        const cookies = await context.cookies();
        return cookies.find((c) => c.name === "affiliate_code")?.value ?? null;
      })
      .toBe("AFF-TEST123");
  });
});
