import { test, expect } from "@playwright/test";

test.describe("Public Menu & Catalog E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("should render store logo, name, and active categories", async ({ page }) => {
    await expect(page.locator("header")).toContainText("Doutor Burger");
    const categoryTabs = page.locator(".category-pill, .category-tab, button");
    await expect(categoryTabs.first()).toBeVisible();
  });

  test("should filter products by search input", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill("Doutor");
    const productCards = page.locator(".product-card");
    await expect(productCards.first()).toContainText("Doutor");
  });

  test("should open product detail modal on click", async ({ page }) => {
    const productCard = page.locator(".product-card").first();
    await productCard.click();
    const modal = page.locator(".product-detail-modal, .drawer-card, [role='dialog']");
    await expect(modal).toBeVisible();
  });
});
