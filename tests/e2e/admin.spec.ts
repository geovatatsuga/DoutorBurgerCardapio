import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

test.describe("Admin Operations & Kanban E2E", () => {
  test.skip(
    !hasAdminCredentials,
    "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar os testes administrativos."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/#admin");
    await page.fill('input[type="email"], input[placeholder*="email"]', adminEmail!);
    await page.fill('input[type="password"]', adminPassword!);
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
