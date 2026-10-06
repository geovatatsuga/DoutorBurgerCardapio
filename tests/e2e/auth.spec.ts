import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

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
    test.skip(
      !hasAdminCredentials,
      "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar o teste de login administrativo."
    );
    await page.goto("http://localhost:5173/#admin");
    await page.fill('input[type="email"], input[placeholder*="email"]', adminEmail!);
    await page.fill('input[type="password"]', adminPassword!);
    await page.click('button[type="submit"]');

    const dashboardHeader = page.locator("header, .kanban-board, .admin-container");
    await expect(dashboardHeader).toBeVisible();
  });
});
