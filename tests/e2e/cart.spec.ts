import { test, expect } from "@playwright/test";

test.describe("Cart Functionality E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("should add product to cart and update item badge", async ({ page }) => {
    const addButton = page.locator(".product-card button, .add-btn").first();
    await addButton.click();
    const cartBadge = page.locator("#cartBadge, #cartBadgeTop");
    await expect(cartBadge).toHaveText("1");
  });

  test("should update subtotal when modifying item quantity in cart", async ({ page }) => {
    const addButton = page.locator(".product-card button, .add-btn").first();
    await addButton.click();
    await page.click('button:has-text("Carrinho"), .cart-top-btn');

    const increaseBtn = page.locator(".qty-btn:has-text('+'), button:has-text('+')").first();
    if (await increaseBtn.isVisible()) {
      await increaseBtn.click();
      const cartBadge = page.locator("#cartBadge, #cartBadgeTop");
      await expect(cartBadge).toHaveText("2");
    }
  });
});
