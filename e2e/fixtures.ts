import { test as base, Page } from "@playwright/test";

/**
 * Test fixtures for E2E tests
 */

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  // Fixture for authenticated page - 'provide' is Playwright's fixture callback
  authenticatedPage: async ({ page }, provide) => {
    // Login before test
    await page.goto("/login");
    await page.waitForSelector('input[id="email"]', { timeout: 10000 });
    await page.fill('input[id="email"]', "admin@clawmemaybe.com");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    await provide(page);
  },
});

export { expect } from "@playwright/test";
