import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");
    // Wait for the page to be loaded (LoginForm is inside Suspense)
    await page.waitForSelector('input[id="email"]', { timeout: 10000 });
  });

  test("should display login form", async ({ page }) => {
    // Check page elements - CardTitle is a div, not h2
    await expect(page.locator("text=ClawMeMaybe")).toBeVisible();
    await expect(page.locator('label[for="email"]')).toContainText("Email");
    await expect(page.locator('label[for="password"]')).toContainText(
      "Password"
    );
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Sign in"
    );
  });

  test("should show validation error for empty fields", async ({ page }) => {
    // Submit without filling fields
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    // Check that the email input has the validation error
    const emailInput = page.locator('input[id="email"]');
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Fill with wrong credentials
    await page.fill('input[id="email"]', "wrong@example.com");
    await page.fill('input[id="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Wait for error message - it shows "Invalid credentials" from API
    await expect(
      page.locator("text=/Invalid credentials|Login failed/i")
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should successfully login with valid credentials", async ({ page }) => {
    // Fill with correct credentials
    await page.fill('input[id="email"]', "admin@clawmemaybe.com");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Should redirect away from login page
    // Wait for URL to change from /login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    // Verify we're no longer on login page
    expect(page.url()).not.toContain("/login");
  });

  test("should redirect to login when accessing protected route unauthenticated", async ({
    page,
  }) => {
    // Clear any existing cookies/session
    await page.context().clearCookies();

    // Try to access protected route directly
    await page.goto("/instances");

    // Should be redirected to login page
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("should preserve redirect URL after login", async ({ page }) => {
    // Clear session first
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto("/instances");

    // Should be redirected to login with redirect param
    await page.waitForURL(/\/login\?redirect=/);

    // Login
    await page.waitForSelector('input[id="email"]', { timeout: 10000 });
    await page.fill('input[id="email"]', "admin@clawmemaybe.com");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Should redirect back to instances
    await page.waitForURL("**/instances", { timeout: 15000 });
  });
});
