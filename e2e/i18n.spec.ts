import { test, expect } from "@playwright/test";

test.describe("Internationalization (RO/EN)", () => {
  test("homepage defaults to Romanian and switches to English", async ({
    page,
  }) => {
    // Force a desktop viewport so the language switcher (hidden on mobile) shows.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // RO default — the nav exposes the Romanian label.
    await expect(
      page.getByRole("link", { name: "Parfumuri" }).first(),
    ).toBeVisible();

    // Switch to English.
    await page.getByRole("button", { name: "English" }).click();

    // The nav label localizes to English; the URL stays unprefixed ("/").
    await expect(
      page.getByRole("link", { name: "Perfumes" }).first(),
    ).toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
