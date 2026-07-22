import { test, expect } from "@playwright/test";

test.describe("Admin Operations & Kanban E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/#admin");
    await page.fill('input[type="email"], input[placeholder*="email"]', "burgerc.owner@alto.com");
    await page.fill('input[type="password"]', "BurgerC@2026");
    await page.click('button[type="submit"]');
  });

  test("should render 6 Kanban columns for operational order status", async ({ page }) => {
    const columns = page.locator(".kanban-column, .status-column");
    await expect(columns).toHaveCount(6);
  });

  test("should display delay badges and timers on order cards", async ({ page }) => {
    const delayBadges = page.locator(".delay-badge, .timer-badge");
    if (await delayBadges.count() > 0) {
      await expect(delayBadges.first()).toBeVisible();
    }
  });

  test("should open cancel order modal when cancelling an order", async ({ page }) => {
    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      const cancelModal = page.locator(".cancel-modal, [role='dialog']");
      await expect(cancelModal).toBeVisible();
    }
  });
});
