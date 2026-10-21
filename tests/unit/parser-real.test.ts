import { describe, expect, it } from "vitest";
import { parsePsiResponse } from "@/server/psi/parser";
import { extractOpportunities } from "@/server/recommendations/opportunities";
import real from "../fixtures/psi-real-webdev-mobile-excerpt.json";
import { SYNTHETIC_PSI_WITH_FIELD } from "../fixtures/psi-synthetic";

describe("REAL captured fixture: web.dev mobile excerpt (regressions found on real data)", () => {
  const p = parsePsiResponse(real);
  it("parses URL-level CrUX data including INP and scaled CLS", () => {
    expect(p.field.scope).toBe("url");
    expect(p.field.inpMs?.value).toBe(real.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile);
    expect(p.field.cls?.value).toBeCloseTo(real.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100);
  });
  it("bug fix: TBT-only metricSavings (bootup-time) keeps its savings value", () => {
    const boot = p.opportunities.find((o) => o.id === "bootup-time");
    expect(boot?.savingsMs).toBe(real.lighthouseResult.audits["bootup-time"].metricSavings.TBT);
  });
  it("includes Lighthouse 13 insight audits with savings, excludes metric audits", () => {
    const ids = p.opportunities.map((o) => o.id);
    expect(ids).toContain("render-blocking-insight");
    expect(ids).not.toContain("largest-contentful-paint");
  });
});

describe("bestSavingsMs (SYNTHETIC)", () => {
  it("uses the max across LCP/FCP/TBT/INP, ignoring zeroes", () => {
    const audits = { ...SYNTHETIC_PSI_WITH_FIELD.lighthouseResult.audits,
      x: { id: "x", title: "X", score: 0, scoreDisplayMode: "metricSavings", metricSavings: { LCP: 0, TBT: 250, CLS: 0.2 } } };
    expect(extractOpportunities(audits).find((o) => o.id === "x")?.savingsMs).toBe(250);
  });
});
