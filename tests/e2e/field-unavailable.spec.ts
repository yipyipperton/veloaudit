import { expect, test } from "@playwright/test";

/**
 * SYNTHETIC MOCKED API RESPONSE — not real data. Real audits of example.com / web.dev both have CrUX
 * data, so the "no field data" UI state is exercised here via request interception.
 */
const id = "cmockmockmockmockmockmock";
const SYNTHETIC_AUDIT = {
  id, url: "https://synthetic.invalid/", strategy: "mobile", status: "SUCCEEDED", error: null,
  createdAt: new Date().toISOString(), startedAt: null, completedAt: new Date().toISOString(),
  finalUrl: null, lighthouseVersion: "synthetic", fetchTime: null,
  lab: { score: 50, lcpMs: 2000, fcpMs: 1000, speedIndexMs: 1500, tbtMs: 400, cls: 0.1, ttfbMs: 50 },
  field: { scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null },
  opportunities: [], diagnostics: [], runId: null,
  labMetricScores: { lcp: null, fcp: null, si: null, tbt: null, cls: null }, fieldDistributions: {},
  screenshots: { final: null, thumbnails: [] },
  categoryScores: { performance: 50, accessibility: null, bestPractices: null, seo: null }, categories: [],
};

test("field metrics show Unavailable and INP is not filled from TBT", async ({ page }) => {
  await page.route(`**/api/audits/${id}`, (r) => r.fulfill({ json: { audit: SYNTHETIC_AUDIT } }));
  await page.goto(`/audits/${id}`);
  await expect(page.getByText("No Chrome UX Report field data")).toBeVisible();
  for (const m of ["lcp", "inp", "cls", "fcp", "ttfb"]) await expect(page.getByTestId(`field-${m}`)).toContainText("Unavailable");
  await expect(page.getByTestId("lab-tbt")).toContainText("400 ms");
  await expect(page.getByTestId("field-inp")).not.toContainText("400");
  await expect(page.getByTestId("cwv-assessment")).toHaveAttribute("data-verdict", "no_data");
});
