import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePsiResponse } from "@/server/psi/parser";
import { runPagespeed } from "@/server/psi/client";
import { renderHtml, renderMarkdown } from "@/server/report/render";
import { findMetric } from "@/lib/metrics";
import { CreateBudgetSchema } from "@/server/validation/budgets";
import { syntheticAudit } from "./helpers";
import type { CategoryView } from "@/lib/types";

/** REAL-response-derived fixture (see tests/fixtures/README.md). Expected counts were computed independently from the JSON. */
const REAL = JSON.parse(readFileSync(join(__dirname, "../fixtures/psi-real-webdev-mobile-categories-excerpt.json"), "utf8")) as unknown;
const parsed = () => parsePsiResponse(structuredClone(REAL));
const cat = (id: string) => parsed().categories.find((c) => c.id === id)!;

describe("Lighthouse categories (real web.dev mobile excerpt)", () => {
  it("parses all four category scores", () => {
    expect(parsed().categoryScores).toEqual({ performance: 57, accessibility: 90, bestPractices: 96, seo: 92 });
    expect(parsed().lab.score).toBe(57);
    expect(parsed().categories.map((c) => c.id)).toEqual(["performance", "accessibility", "best-practices", "seo"]);
  });
  it("splits accessibility like PSI: failed (with group titles), passed, manual, not applicable; skips hidden refs", () => {
    const a = cat("accessibility");
    expect(a.failed.map((f) => [f.id, f.group])).toEqual([["color-contrast", "Contrast"], ["frame-title", "Names and labels"], ["link-name", "Names and labels"]]);
    expect([a.passed.length, a.manual.length, a.notApplicable.length]).toEqual([28, 10, 32]);
    expect(a.manual.every((m) => m.description.length > 0)).toBe(true);
  });
  it("keeps failed-audit details: description without markdown links and a node table", () => {
    const cc = cat("accessibility").failed[0]!;
    expect(cc.title).toMatch(/contrast ratio/);
    expect(cc.description).not.toMatch(/\]\(https?:/);
    expect(cc.table?.headings).toEqual(["Failing Elements"]);
    expect(cc.table?.rows.length).toBeGreaterThan(0);
  });
  it("best-practices and seo groups", () => {
    const bp = cat("best-practices"), seo = cat("seo");
    expect(bp.failed.map((f) => [f.id, f.group])).toEqual([["errors-in-console", "General"]]);
    expect([bp.passed.length, bp.manual.length, bp.notApplicable.length]).toEqual([16, 0, 4]);
    expect(seo.failed.map((f) => [f.id, f.group])).toEqual([["link-text", "Content Best Practices"]]);
    expect([seo.passed.length, seo.manual.length, seo.notApplicable.length]).toEqual([9, 1, 0]);
  });
  it("performance-only responses yield null category scores (never defaulted)", () => {
    const r = structuredClone(REAL) as { lighthouseResult: { categories: Record<string, unknown> } };
    r.lighthouseResult.categories = { performance: r.lighthouseResult.categories["performance"] };
    expect(parsePsiResponse(r).categoryScores).toEqual({ performance: 57, accessibility: null, bestPractices: null, seo: null });
  });
});

describe("PSI request", () => {
  it("requests all four categories as repeated params", async () => {
    let seen = "";
    await runPagespeed("https://x.invalid/", "mobile", { fetchImpl: (async (u: RequestInfo | URL) => { seen = String(u); return new Response("{}"); }) as typeof fetch });
    expect(new URL(seen).searchParams.getAll("category")).toEqual(["performance", "accessibility", "best-practices", "seo"]);
  });
  it("rejects oversized bodies without retrying", async () => {
    let calls = 0;
    const big = (async () => { calls++; return new Response("x".repeat(8 * 1024 * 1024 + 1)); }) as typeof fetch;
    await expect(runPagespeed("https://x.invalid/", "mobile", { fetchImpl: big, sleep: async () => {} })).rejects.toMatchObject({ code: "PSI_BAD_RESPONSE" });
    expect(calls).toBe(1);
  });
});

describe("categories in budgets and reports", () => {
  it("category scores are lab budget metrics (0-100, higher is better)", () => {
    expect(findMetric("lab", "accessibility")).toMatchObject({ unit: "score", better: "higher" });
    expect(CreateBudgetSchema.safeParse({ url: "https://web.dev", strategy: "mobile", source: "lab", metric: "best-practices", threshold: 90 }).success).toBe(true);
    expect(CreateBudgetSchema.safeParse({ url: "https://web.dev", strategy: "mobile", source: "lab", metric: "seo", threshold: 101 }).success).toBe(false);
    expect(CreateBudgetSchema.safeParse({ url: "https://web.dev", strategy: "mobile", source: "field", metric: "seo", threshold: 90 }).success).toBe(false);
  });
  it("reports include category scores and failed audits", () => {
    const categories = parsed().categories as unknown as CategoryView[];
    const a = syntheticAudit({ categories, categoryScores: { performance: 57, accessibility: 90, bestPractices: 96, seo: 92 } });
    const md = renderMarkdown(a);
    expect(md).toContain("| Accessibility | 90 | 3 | 28 | 10 | 32 |");
    expect(md).toMatch(/## Accessibility — failed audits \(3\)/);
    expect(renderHtml(a)).toContain("Best Practices: failed audits (1)");
  });
});
