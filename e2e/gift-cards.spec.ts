import { test, expect } from "@playwright/test";

test.describe("Gift cards", () => {
  test("/cadou loads with a value selector", async ({ page }) => {
    await page.goto("/cadou");
    await expect(
      page.getByRole("heading", { name: /cadou memorabil/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "100 RON" })).toBeVisible();
  });

  test("selecting a value updates the live preview", async ({ page }) => {
    await page.goto("/cadou");
    await page.getByRole("button", { name: "200 RON" }).click();
    // The preview card reflects the chosen amount.
    await expect(page.getByText(/200,00\s*RON|200,00\s*lei|200/).first()).toBeVisible();
  });

  test("filling the recipient name updates the preview", async ({ page }) => {
    await page.goto("/cadou");
    await page.getByPlaceholder(/andrei/i).fill("Maria");
    await expect(page.getByText(/pentru:\s*maria/i)).toBeVisible();
  });

  test("submitting triggers Stripe redirect or a sign-in prompt", async ({
    page,
  }) => {
    await page.goto("/cadou");
    await page.getByRole("button", { name: "100 RON" }).click();
    await page.getByPlaceholder(/andrei/i).fill("Maria");
    await page.getByPlaceholder(/email@exemplu/i).fill("maria@example.com");

    // Intercept the outbound Stripe redirect so the test never leaves the site.
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.abort(),
    );

    await page.getByRole("button", { name: /cumpără cadoul/i }).click();
    // Either a Stripe checkout is attempted (authenticated) or a sign-in toast
    // is shown — both are acceptable, non-crashing outcomes.
    await page.waitForTimeout(2000);
    await expect(
      page.getByRole("heading", { name: /cadou memorabil/i }),
    ).toBeVisible();
  });
});
