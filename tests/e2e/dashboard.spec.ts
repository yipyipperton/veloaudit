import { expect, test } from "@playwright/test";

test("rejects private URL with a friendly error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("URL").fill("http://127.0.0.1/");
  await page.getByRole("button", { name: "Run audit" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(/not allowed/);
});

test("submits a real audit and shows a terminal status (requires worker + PSI)", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("URL").fill("https://example.com");
  await page.getByRole("radio", { name: "Desktop" }).click();
  await page.getByRole("button", { name: "Run audit" }).click();
  await page.waitForURL(/\/audits\//);
  await expect(page.getByTestId("status").first()).toHaveText(/succeeded|failed/, { timeout: 110_000 });
  await page.screenshot({ path: "test-results/audit.png", fullPage: true });
});

test("real audit renders lab, field, and opportunities (requires PSI key)", async ({ page }) => {
  test.skip(!process.env.E2E_REAL_PSI, "set E2E_REAL_PSI=1 to run against live PSI");
  await page.goto("/");
  await page.getByLabel("URL").fill("https://web.dev");
  await page.getByRole("button", { name: "Run audit" }).click();
  await page.waitForURL(/\/audits\//);
  await expect(page.getByTestId("status").first()).toHaveText("succeeded", { timeout: 110_000 });
  await expect(page.getByTestId("score")).toHaveText(/^\d{1,3}$/);
  await expect(page.getByTestId("lab-lcp")).not.toContainText("Unavailable");
  await expect(page.getByTestId("field-inp")).toBeVisible();
  await expect(page.getByTestId("opportunities").locator("li").first()).toBeVisible();
  await page.goto("/");
  await expect(page.locator("table tbody tr").first()).toContainText("web.dev");
});
