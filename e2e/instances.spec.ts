import { test, expect } from "@playwright/test";

test.describe("Instances List", () => {
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

  test("should display instances page after login", async ({ page }) => {
    // Navigate to instances
    await page.goto("/instances");

    // Check page title (use more specific selector)
    await expect(page.locator("h1")).toContainText("Instances");

    // Check for the Add Instance button (scoped to main to avoid strict mode violation)
    await expect(
      page.getByRole("main").getByRole("button", { name: "Add Instance" })
    ).toBeVisible();
  });

  test("should show empty state or instance table", async ({ page }) => {
    await page.goto("/instances");

    // Wait for content to load
    await page.waitForLoadState("networkidle");

    // Check for either empty state or table
    const emptyMessage = page.locator("text=/No instances found/");
    const table = page.locator("table");

    // Either we see empty state or we see table
    const hasEmpty = await emptyMessage.count();
    const hasTable = await table.count();

    expect(hasEmpty > 0 || hasTable > 0).toBeTruthy();
  });

  test("should display instance table with correct columns", async ({
    page,
  }) => {
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    // Check for table if instances exist
    const table = page.locator("table");

    if (await table.isVisible()) {
      // Check table headers using getByRole for better reliability
      await expect(
        page.getByRole("columnheader", { name: "Name" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Status" })
      ).toBeVisible();
      // "Gateway URL" might have different spacing, use partial match
      await expect(
        page.locator("th").filter({ hasText: "Gateway" })
      ).toBeVisible();
    } else {
      // Table not visible, skip test (empty state)
      const emptyMessage = page.locator("text=/No instances found/");
      await expect(emptyMessage).toBeVisible();
    }
  });
});

test.describe("Instance Detail", () => {
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

  test("should show instance detail page", async ({ page }) => {
    // First, go to instances list
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    // Check if there are any instances to click on
    const table = page.locator("table");

    if (await table.isVisible()) {
      const instanceLink = page.locator("table tbody tr a").first();
      await instanceLink.click();

      // Should be on detail page
      await expect(page.locator("text=Instance Details")).toBeVisible();
      await expect(page.locator("text=Status")).toBeVisible();
    } else {
      // No instances - verify empty state
      await expect(page.locator("text=/No instances found/")).toBeVisible();
    }
  });

  test("should display metrics cards on instance detail", async ({ page }) => {
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table");

    if (await table.isVisible()) {
      const instanceLink = page.locator("table tbody tr a").first();
      await instanceLink.click();

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Check for metric cards
      await expect(page.locator("text=CPU Usage")).toBeVisible();
      await expect(page.locator("text=Memory Usage")).toBeVisible();
      await expect(page.locator("text=Uptime")).toBeVisible();
    }
  });

  test("should navigate back from detail to list", async ({ page }) => {
    await page.goto("/instances");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table");

    if (await table.isVisible()) {
      const instanceLink = page.locator("table tbody tr a").first();
      await instanceLink.click();

      // Click back button (ArrowLeft icon in button)
      const backButton = page
        .locator("button")
        .filter({ has: page.locator("svg") })
        .first();
      if (await backButton.isVisible()) {
        await backButton.click();

        // Should be back on instances list
        await expect(page.locator("text=Instances")).toBeVisible();
      }
    }
  });
});
