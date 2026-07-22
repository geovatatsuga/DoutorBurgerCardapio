import { test, expect } from "@playwright/test";

test.describe("Authentication & Authorization E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("should display login screen for admin URL", async ({ page }) => {
    await page.goto("http://localhost:5173/#admin");
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("should show error on invalid login credentials", async ({ page }) => {
    await page.goto("http://localhost:5173/#admin");
    await page.fill('input[type="email"], input[placeholder*="email"]', "invalid@user.com");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    const errorMessage = page.locator(".login-error, .error, [style*='color: #d93838']");
    await expect(errorMessage).toBeVisible();
  });

  test("should login successfully with valid admin credentials", async ({ page }) => {
    await page.goto("http://localhost:5173/#admin");
    await page.fill('input[type="email"], input[placeholder*="email"]', "burgerc.owner@alto.com");
    await page.fill('input[type="password"]', "BurgerC@2026");
    await page.click('button[type="submit"]');

    const dashboardHeader = page.locator("header, .kanban-board, .admin-container");
    await expect(dashboardHeader).toBeVisible();
  });
});
