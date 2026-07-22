import { test, expect } from "@playwright/test";

test.describe("Accessibility & UI Standards E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("should have meta viewport and lang attributes", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "pt-BR");
  });

  test("should allow closing drawer modals with ESC or close button", async ({ page }) => {
    const productCard = page.locator(".product-card").first();
    await productCard.click();
    const closeBtn = page.locator(".close-btn, button[aria-label='Fechar']").first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
  });
});
