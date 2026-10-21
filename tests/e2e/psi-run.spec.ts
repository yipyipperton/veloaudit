import { expect, test, type Page } from "@playwright/test";

/**
 * SYNTHETIC MOCKED API RESPONSES — not real data. Exercises the tabbed PSI-style run page
 * (CWV banner, distribution bars, indicators, expandable findings, screenshots) without calling PSI.
 */
const RUN = "cmockrunmockrunmockrunmock";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const now = new Date().toISOString();
function audit(strategy: "mobile" | "desktop", score: number, status = "SUCCEEDED") {
  const id = `cmock${strategy}mockmockmockmo`.slice(0, 25);
  return {
    id, runId: RUN, url: "https://synthetic.invalid/", strategy, status, error: null, createdAt: now, startedAt: now, completedAt: status === "SUCCEEDED" ? now : null,
    finalUrl: "https://synthetic.invalid/", lighthouseVersion: "SYNTHETIC", fetchTime: now,
    lab: { score, lcpMs: strategy === "mobile" ? 4200 : 1100, fcpMs: 1500, speedIndexMs: 3000, tbtMs: 350, cls: 0.02, ttfbMs: 80 },
    labMetricScores: { lcp: strategy === "mobile" ? 0.3 : 0.95, fcp: 0.7, si: 0.6, tbt: 0.55, cls: 1 },
    field: { scope: "url", overall: "AVERAGE", lcpMs: { value: 2400, category: "FAST" }, inpMs: { value: 250, category: "AVERAGE" }, cls: { value: 0.05, category: "FAST" }, fcpMs: { value: 1700, category: "FAST" }, ttfbMs: null },
    fieldDistributions: { lcp: [0.8, 0.15, 0.05], inp: [0.6, 0.3, 0.1], cls: [0.9, 0.06, 0.04] },
    opportunities: [{ id: "render-blocking-insight", title: "Render-blocking requests", description: "SYNTHETIC description.", score: 0, displayValue: null, savingsMs: 900, savingsBytes: null, metricSavings: { LCP: 900 }, table: { headings: ["URL", "Duration"], rows: [["https://synthetic.invalid/app.css", "900 ms"]] } }],
    diagnostics: [{ id: "dom-size", title: "Avoid an excessive DOM size", description: "SYNTHETIC.", score: 0.4, displayValue: "2,000 elements", savingsMs: null, savingsBytes: null, metricSavings: {} }],
    screenshots: { final: { src: `/api/audits/${id}/screenshot?kind=final&i=0`, timingMs: null }, thumbnails: [{ src: `/api/audits/${id}/screenshot?kind=thumb&i=0`, timingMs: 400 }] },
  };
}
async function mock(page: Page, run: object) {
  await page.route(`**/api/runs/${RUN}`, (r) => r.fulfill({ json: { run } }));
  await page.route("**/api/audits/*/screenshot*", (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  await page.route("**/api/budgets*", (r) => r.fulfill({ json: { budgets: [], results: [] } }));
}

test("run page: mobile/desktop tabs, CWV banner, distributions, indicators, expandable rows, screenshots (SYNTHETIC)", async ({ page }) => {
  await mock(page, { id: RUN, url: "https://synthetic.invalid/", createdAt: now, status: "SUCCEEDED", audits: [audit("mobile", 42), audit("desktop", 93)] });
  await page.goto(`/runs/${RUN}`);
  await expect(page.getByRole("tab", { name: "mobile" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("score")).toHaveText("42");
  await expect(page.getByTestId("cwv-assessment")).toContainText("Failed"); // INP needs improvement
  await expect(page.getByTestId("field-lcp").getByRole("img", { name: /Good 80%/ })).toBeVisible();
  await expect(page.getByTestId("field-ttfb")).toContainText("Unavailable");
  await expect(page.getByTestId("lab-lcp").locator("[data-rating=poor]")).toBeVisible();
  await expect(page.getByTestId("final-screenshot")).toBeVisible();
  await expect(page.getByTestId("filmstrip").locator("img")).toHaveCount(1);
  const row = page.getByTestId("opportunities").locator("details").first();
  await expect(row.getByText("https://synthetic.invalid/app.css")).toBeHidden();
  await row.locator("summary").click();
  await expect(row.getByText("https://synthetic.invalid/app.css")).toBeVisible();
  await expect(page.getByTestId("diagnostics")).toContainText("Avoid an excessive DOM size");

  await page.getByRole("tab", { name: "desktop" }).click();
  await expect(page.getByTestId("score")).toHaveText("93");
  await expect(page.getByTestId("lab-lcp").locator("[data-rating=good]")).toBeVisible();
  await expect(page).toHaveURL(/tab=desktop/);
});

test("run page shows live per-device progress while audits are pending (SYNTHETIC)", async ({ page }) => {
  await mock(page, { id: RUN, url: "https://synthetic.invalid/", createdAt: now, status: "RUNNING", audits: [audit("mobile", 42), { ...audit("desktop", 0, "RUNNING"), lab: { score: null } }] });
  await page.goto(`/runs/${RUN}?tab=desktop`);
  await expect(page.getByTestId("progress-mobile")).toContainText("42");
  await expect(page.getByTestId("progress-desktop")).toContainText(/running/);
  await expect(page.getByText(/desktop audit is running/)).toBeVisible();
});
