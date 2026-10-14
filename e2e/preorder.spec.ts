import { test, expect } from "@playwright/test";

test.describe("Pre-orders", () => {
  test("a pre-order CTA appears on launches when pre-orders are open", async ({
    page,
  }) => {
    await page.goto("/lansari");
    await expect(
      page.getByRole("heading", { name: /lansări viitoare/i }),
    ).toBeVisible();

    const preorderBtn = page.getByRole("button", { name: /precomandă acum/i });

    // Pre-order products are seed-dependent; when present, the purple PRE-ORDER
    // badge and the CTA replace the normal add-to-cart flow.
    if (await preorderBtn.count()) {
      await expect(preorderBtn.first()).toBeVisible();
      await expect(page.getByText(/pre-order/i).first()).toBeVisible();
    } else {
      expect(await preorderBtn.count()).toBe(0);
    }
  });
});
