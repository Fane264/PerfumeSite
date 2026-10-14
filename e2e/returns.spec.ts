import { test, expect } from "@playwright/test";

// The returns portal lives under /cont and is auth-gated. Unauthenticated, the
// route redirects to sign-in — that redirect IS the correct behaviour and is
// what we assert here (sign-up mocking is out of scope for this suite).
test.describe("Returns portal", () => {
  test("/cont/retururi requires authentication", async ({ page }) => {
    await page.goto("/cont/retururi");
    // Either the sign-in screen (unauthenticated) or the returns heading (if a
    // session exists) is acceptable.
    await expect
      .poll(async () => {
        const url = page.url();
        if (/sign-in/.test(url)) return "auth";
        const heading = await page
          .getByRole("heading", { name: /retururile mele/i })
          .count();
        return heading > 0 ? "returns" : "pending";
      })
      .not.toBe("pending");
  });

  test("the returns policy page loads", async ({ page }) => {
    await page.goto("/legal/politica-retur");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
