import { describe, expect, it } from "vitest";
import { parsePsiResponse, PsiParseError } from "@/server/psi/parser";
import { extractOpportunities } from "@/server/recommendations/opportunities";
import { SYNTHETIC_PSI_LH13_SHAPES, SYNTHETIC_PSI_NO_FIELD, SYNTHETIC_PSI_WITH_FIELD } from "../fixtures/psi-synthetic";

describe("parsePsiResponse (SYNTHETIC fixtures)", () => {
  it("parses lab metrics and score", () => {
    expect(parsePsiResponse(SYNTHETIC_PSI_WITH_FIELD).lab).toEqual({ score: 73, lcpMs: 3100, fcpMs: 1800, speedIndexMs: 4000, tbtMs: 450, cls: 0.02, ttfbMs: 120 });
  });
  it("parses field metrics separately, scaling CrUX CLS", () => {
    const f = parsePsiResponse(SYNTHETIC_PSI_WITH_FIELD).field;
    expect(f.scope).toBe("origin");
    expect(f.inpMs).toEqual({ value: 180, category: "FAST" });
    expect(f.cls?.value).toBeCloseTo(0.05);
    expect(f.ttfbMs?.value).toBe(700);
  });
  it("leaves field data unavailable and never derives INP from TBT", () => {
    const p = parsePsiResponse(SYNTHETIC_PSI_NO_FIELD);
    expect(p.lab.tbtMs).toBe(250);
    expect(p.field).toEqual({ scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null });
    expect(p.lab.cls).toBeNull();
  });
  it("extracts only failing opportunities, sorted by savings", () => {
    const o = parsePsiResponse(SYNTHETIC_PSI_WITH_FIELD).opportunities;
    expect(o.map((x) => x.id)).toEqual(["render-blocking-resources", "unused-javascript"]);
    expect(o[0]?.description).toBe("See docs.");
  });
  it("throws on malformed responses", () => {
    expect(() => parsePsiResponse({ nope: true })).toThrow(PsiParseError);
  });
});

describe("regressions found on real Lighthouse 13 data (SYNTHETIC values, real shapes)", () => {
  const p = parsePsiResponse(SYNTHETIC_PSI_LH13_SHAPES);
  it("bug fix: TBT-only metricSavings (bootup-time) keeps its savings value", () => {
    expect(p.opportunities.find((o) => o.id === "bootup-time")?.savingsMs).toBe(800);
  });
  it("includes insight audits, excludes metric audits and zero-savings audits", () => {
    const ids = p.opportunities.map((o) => o.id);
    expect(ids).toContain("render-blocking-insight");
    expect(ids).not.toContain("largest-contentful-paint");
    expect(ids).not.toContain("unsized-images");
  });
  it("keeps CLS-only savings in metricSavings with null ms savings", () => {
    const ls = p.opportunities.find((o) => o.id === "layout-shifts");
    expect(ls?.savingsMs).toBeNull();
    expect(ls?.metricSavings["CLS"]).toBe(0.129);
  });
  it("lab server-response-time is passed through as measured (not a full TTFB)", () => {
    expect(p.lab.ttfbMs).toBe(4);
  });
  it("bestSavingsMs uses max across LCP/FCP/TBT/INP", () => {
    const o = extractOpportunities({ x: { id: "x", title: "X", score: 0, scoreDisplayMode: "metricSavings", metricSavings: { LCP: 0, TBT: 250, CLS: 0.2 } } });
    expect(o[0]?.savingsMs).toBe(250);
  });
});
