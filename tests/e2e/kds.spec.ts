import { test, expect } from "@playwright/test";

test.describe("Kitchen Display System (KDS) E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/#cozinha");
  });

  test("should render kitchen order stream view", async ({ page }) => {
    const kitchenView = page.locator(".kds-container, .kitchen-stream, .kanban-board");
    await expect(kitchenView).toBeVisible();
  });
});
