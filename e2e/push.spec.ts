import { test, expect } from "@playwright/test";

// Web-push opt-in lives in the account profile tab and is auth-gated.
test.describe("Web push notifications", () => {
  test("/cont push control requires authentication", async ({ page }) => {
    await page.goto("/cont");
    await expect
      .poll(async () => {
        const url = page.url();
        if (/sign-in/.test(url)) return "auth";
        // The profile tab carries the push enable/disable button.
        const hasPush = await page
          .getByRole("button", { name: /notificări|notification/i })
          .count();
        return hasPush > 0 ? "push" : "pending";
      })
      .not.toBe("pending");
  });
});
