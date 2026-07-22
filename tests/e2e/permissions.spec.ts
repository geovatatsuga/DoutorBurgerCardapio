import { test, expect } from "@playwright/test";

test.describe("Store Access & Permissions E2E", () => {
  test("should redirect unauthenticated users away from admin dashboard", async ({ page }) => {
    await page.goto("http://localhost:5173/#admin");
    const loginForm = page.locator('form, input[type="email"]');
    await expect(loginForm).toBeVisible();
  });
});
