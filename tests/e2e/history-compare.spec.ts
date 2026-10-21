import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * SYNTHETIC DATA — seeded directly into the app database for this test and removed afterwards.
 * URL uses the reserved .invalid TLD and lighthouseVersion is "SYNTHETIC" so it can never be mistaken for a real audit.
 */
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://velo:velo@localhost:5432/veloaudit?schema=public" });
const URL_ = "https://synthetic-e2e.invalid/";
const ids: string[] = [];

test.beforeAll(async () => {
  await prisma.budget.deleteMany({ where: { url: URL_ } });
  await prisma.audit.deleteMany({ where: { url: URL_ } });
  const rows = [
    { day: 1, labScore: 60, labLcpMs: 4000, labTbtMs: 600, labCls: 0.2, fieldLcpMs: 3000, fieldInpMs: 250, fieldCls: 0.15 },
    { day: 2, labScore: 75, labLcpMs: 3000, labTbtMs: 400, labCls: 0.1, fieldLcpMs: 2800, fieldInpMs: null, fieldCls: 0.12 },
    { day: 3, labScore: 88, labLcpMs: 2200, labTbtMs: 200, labCls: 0.05, fieldLcpMs: 2600, fieldInpMs: 190, fieldCls: 0.1 },
  ];
  for (const r of rows) {
    const a = await prisma.audit.create({ data: {
      url: URL_, strategy: "MOBILE", status: "SUCCEEDED", createdAt: new Date(Date.UTC(2000, 0, r.day)), completedAt: new Date(Date.UTC(2000, 0, r.day)),
      lighthouseVersion: "SYNTHETIC", labScore: r.labScore, labLcpMs: r.labLcpMs, labFcpMs: 1000, labSpeedIndexMs: 2000, labTbtMs: r.labTbtMs, labCls: r.labCls, labTtfbMs: 50,
      fieldScope: "url", fieldLcpMs: r.fieldLcpMs, fieldInpMs: r.fieldInpMs, fieldCls: r.fieldCls, fieldFcpMs: 1500, fieldTtfbMs: 600, opportunities: [],
    } });
    ids.push(a.id);
  }
});
test.afterAll(async () => {
  await prisma.budget.deleteMany({ where: { url: URL_ } });
  await prisma.audit.deleteMany({ where: { url: URL_ } });
  await prisma.$disconnect();
});

test("history shows separate lab and field trend charts and compares two runs (SYNTHETIC seed)", async ({ page }) => {
  await page.goto(`/history?url=${encodeURIComponent(URL_)}&strategy=mobile`);
  await expect(page.getByText("3 completed audits")).toBeVisible();
  for (const id of ["chart-lab-score", "chart-lab-timings", "chart-lab-cls", "chart-field-timings", "chart-field-cls"])
    await expect(page.getByTestId(id).getByRole("application")).toBeVisible();
  await expect(page.getByText(/Lab · Lighthouse/)).toBeVisible();
  await expect(page.getByText(/Field · CrUX p75/)).toBeVisible();
  await expect(page.getByTestId("chart-field-timings")).toContainText("Field INP");
  await expect(page.getByTestId("chart-lab-timings")).not.toContainText("Field");

  await page.getByLabel("Select run 1").check();
  await page.getByLabel("Select run 3").check();
  await page.getByTestId("compare-btn").click();
  await page.waitForURL(/\/compare\?/);
  await expect(page.getByTestId("caveat")).toContainText(/does not prove/);
  await expect(page.getByTestId("caveat")).toContainText(/vary from run to run/);
  const score = page.getByTestId("delta-lab-score");
  await expect(score).toContainText("60");
  await expect(score).toContainText("88");
  await expect(score).toContainText("+28");
  await expect(score).toContainText("improved");
  await expect(page.getByTestId("delta-field-inp")).toContainText("improved");
});

test("compare marks a missing field value as not comparable (SYNTHETIC seed)", async ({ page }) => {
  await page.goto(`/compare?a=${ids[0]}&b=${ids[1]}`);
  await expect(page.getByTestId("delta-field-inp")).toContainText("not comparable");
  await expect(page.getByTestId("delta-field-inp")).toContainText("Unavailable");
});

test("budgets: field budget on missing data is not evaluable, never pass (SYNTHETIC seed)", async ({ page }) => {
  await page.goto(`/audits/${ids[1]}`);
  await page.getByLabel("Budget source").selectOption("field");
  await page.getByLabel("Budget metric").selectOption("inp");
  await page.getByLabel("Budget threshold").fill("200");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByTestId("budget-field-inp").getByTestId("budget-status")).toHaveText("not evaluable");
  await page.getByLabel("Budget source").selectOption("lab");
  await page.getByLabel("Budget metric").selectOption("score");
  await page.getByLabel("Budget threshold").fill("70");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByTestId("budget-lab-score").getByTestId("budget-status")).toHaveText("pass");
  const md = await page.request.get(`/api/audits/${ids[1]}/report?format=md`);
  expect(await md.text()).toContain("NOT EVALUABLE");
});

test("theme toggle switches to dark mode", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
