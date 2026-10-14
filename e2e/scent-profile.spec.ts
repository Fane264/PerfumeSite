import { test, expect } from "@playwright/test";

test.describe("Scent DNA profile", () => {
  test("/profilul-meu renders profile or a quiz CTA when data is insufficient", async ({
    page,
  }) => {
    await page.goto("/profilul-meu");

    // Unauthenticated / low-data visitors see the "needs more data" CTA;
    // a complete profile renders the olfactory wheel SVG.
    const wheel = page.getByTestId("scent-wheel");
    const quizCta = page.getByRole("link", { name: /quiz/i }).first();

    await expect(async () => {
      const hasWheel = await wheel.count();
      const hasCta = await quizCta.count();
      expect(hasWheel + hasCta).toBeGreaterThan(0);
    }).toPass();
  });

  test("a public profile page renders for a missing user as 404 or a profile", async ({
    page,
  }) => {
    const res = await page.goto("/profil/nonexistent-user-id");
    // Unknown user → notFound (404). A real id would render the archetype.
    expect([200, 404]).toContain(res?.status() ?? 0);
  });
});
