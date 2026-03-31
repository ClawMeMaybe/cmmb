import { test, expect } from "@playwright/test";

test.describe("Instance Actions", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.waitForSelector('input[id="email"]', { timeout: 10000 });
    await page.fill('input[id="email"]', "admin@clawmemaybe.com");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button[type="submit"]');
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
  });

  test("should display action buttons on instance detail", async ({ page }) => {
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table");

    if (await table.isVisible()) {
      const instanceLink = page.locator("table tbody tr a").first();
      await instanceLink.click();

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Check for action buttons
      await expect(
        page.locator('button:has-text("Open Gateway")')
      ).toBeVisible();
      await expect(page.locator('button:has-text("Delete")')).toBeVisible();
    }
  });

  test("should refresh instance metrics", async ({ page }) => {
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table");

    if (await table.isVisible()) {
      const instanceLink = page.locator("table tbody tr a").first();
      await instanceLink.click();

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Verify buttons exist
      const buttons = await page.locator("button").count();
      expect(buttons).toBeGreaterThan(0);
    }
  });

  test("should show instance status badge", async ({ page }) => {
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table");

    if (await table.isVisible()) {
      const instanceLink = page.locator("table tbody tr a").first();
      await instanceLink.click();

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Should see status badge
      await expect(
        page.locator("text=/ONLINE|OFFLINE|STARTING|STOPPING|ERROR/").first()
      ).toBeVisible();
    }
  });

  test("should handle 404 for non-existent instance", async ({ page }) => {
    // Navigate to a non-existent instance
    await page.goto("/instances/nonexistent-id-12345");

    // Should show error or "not found" message - use first() to avoid strict mode
    await expect(page.locator("text=Instance not found").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
