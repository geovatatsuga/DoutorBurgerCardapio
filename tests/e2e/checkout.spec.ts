import { test, expect } from "@playwright/test";

test.describe("Checkout Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("should require address for delivery mode", async ({ page }) => {
    await page.locator(".product-card button, .add-btn").first().click();
    await page.click('button:has-text("Carrinho"), .cart-top-btn');
    await page.click('button:has-text("Finalizar"), button:has-text("Avançar")');

    const addressInput = page.locator('input[placeholder*="Rua"]');
    if (await addressInput.isVisible()) {
      await addressInput.fill("");
      await page.click('button:has-text("Avançar")');
      const errorMessage = page.locator(":text('preencha o seu endereço')");
      await expect(errorMessage).toBeVisible();
    }
  });

  test("should display PIX key copy box when PIX payment is selected", async ({ page }) => {
    await page.locator(".product-card button, .add-btn").first().click();
    await page.click('button:has-text("Carrinho"), .cart-top-btn');
    await page.click('button:has-text("Finalizar"), button:has-text("Avançar")');

    const pixOption = page.locator('button:has-text("Pix")');
    if (await pixOption.isVisible()) {
      await pixOption.click();
      const pixCopyBox = page.locator(':text("Copiar PIX")');
      await expect(pixCopyBox).toBeVisible();
    }
  });
});
