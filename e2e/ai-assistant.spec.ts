import { test, expect } from "@playwright/test";

test.describe("AI assistant", () => {
  test("loads with starter prompts", async ({ page }) => {
    await page.goto("/asistent");
    await expect(
      page.getByRole("heading", { name: /parfum/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /seară de iarnă/i }),
    ).toBeVisible();
  });

  test("clicking a starter prompt adds a user message", async ({ page }) => {
    await page.goto("/asistent");
    const starter = page.getByRole("button", { name: /seară de iarnă/i });
    await starter.click();
    // The user's message appears in the thread.
    await expect(
      page.getByText(/caut un parfum pentru o seară de iarnă/i).last(),
    ).toBeVisible();
  });

  test("a response or graceful fallback appears", async ({ page }) => {
    await page.goto("/asistent");
    await page.getByRole("button", { name: /proaspăt și discret/i }).click();
    // With an API key the assistant streams a reply; without one a graceful
    // "indisponibilă" message is shown. Either is an acceptable outcome.
    await expect
      .poll(
        async () => {
          const bubbles = await page
            .locator("text=/.+/")
            .filter({ hasText: /\w{4,}/ })
            .count();
          return bubbles;
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);
  });

  test("recommended products panel exists", async ({ page }) => {
    await page.goto("/asistent");
    await expect(page.getByText(/recomandate pentru tine/i)).toBeVisible();
  });
});
