import { test, expect } from "@playwright/test";

test.describe("Logs Viewer", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@clawmemaybe.com");
    await page.fill("input[type='password']", "admin123");
    await page.click("button[type='submit']");

    // Wait for redirect to dashboard
    await page.waitForURL("/");
  });

  test("should display logs page with navigation", async ({ page }) => {
    // Navigate to logs page via sidebar
    await page.click("text=Logs");

    // Check we're on the logs page
    await expect(page).toHaveURL("/logs");
    await expect(page.locator("h1")).toContainText("Logs");
  });

  test("should show stream controls", async ({ page }) => {
    await page.goto("/logs");

    // Check stream controls are visible
    await expect(page.locator("text=Stream Controls")).toBeVisible();
    await expect(
      page.locator("button", { hasText: "Start Stream" })
    ).toBeVisible();
    await expect(
      page.locator("button", { hasText: "Clear Logs" })
    ).toBeVisible();
  });

  test("should show log filters", async ({ page }) => {
    await page.goto("/logs");

    // Check level filter checkboxes
    await expect(page.locator("text=Level:")).toBeVisible();
    await expect(page.locator("#level-error")).toBeVisible();
    await expect(page.locator("#level-warn")).toBeVisible();
    await expect(page.locator("#level-info")).toBeVisible();
    await expect(page.locator("#level-debug")).toBeVisible();

    // Check source filter dropdown
    await expect(page.locator("text=Source:")).toBeVisible();
  });

  test("should show search input", async ({ page }) => {
    await page.goto("/logs");

    // Check search input is visible
    const searchInput = page.locator("input[placeholder='Search logs...']");
    await expect(searchInput).toBeVisible();
  });

  test("should show tabs for live and historical logs", async ({ page }) => {
    await page.goto("/logs");

    // Check tabs are visible
    await expect(page.locator("text=Live Stream")).toBeVisible();
    await expect(page.locator("text=Historical")).toBeVisible();
  });

  test("should toggle level filters", async ({ page }) => {
    await page.goto("/logs");

    // Uncheck error level
    const errorCheckbox = page.locator("#level-error");
    await errorCheckbox.click();

    // Check it's unchecked
    await expect(errorCheckbox).not.toBeChecked();

    // Re-check it
    await errorCheckbox.click();
    await expect(errorCheckbox).toBeChecked();
  });

  test("should show connection status indicator", async ({ page }) => {
    await page.goto("/logs");

    // Initially should show disconnected status
    await expect(page.locator("text=Disconnected")).toBeVisible();
  });

  test("should show export dialog button", async ({ page }) => {
    await page.goto("/logs");

    // Check export button exists (disabled when no logs)
    const exportButton = page.locator("button", { hasText: "Export" });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeDisabled();
  });

  test("should show auto-scroll toggle", async ({ page }) => {
    await page.goto("/logs");

    // Check auto-scroll switch
    const autoScrollSwitch = page.locator("#auto-scroll");
    await expect(autoScrollSwitch).toBeVisible();
    await expect(autoScrollSwitch).toBeChecked();
  });

  test("should display empty state when no logs", async ({ page }) => {
    await page.goto("/logs");

    // Check empty state message
    await expect(page.locator("text=No logs to display")).toBeVisible();
  });

  test("should navigate to logs from sidebar", async ({ page }) => {
    // Start on dashboard
    await page.goto("/");

    // Click Logs in sidebar
    await page.click("main a:has-text('Logs')");

    // Verify navigation
    await expect(page).toHaveURL("/logs");
  });
});
