import { describe, expect, it } from "vitest";
import { COMPARE_CAVEAT, compareAudits } from "@/lib/compare";
import { syntheticAudit } from "./helpers";

const before = syntheticAudit({ id: "cbeforeaaaaaaaaaaaaaaaaa" });
const after = syntheticAudit({ id: "cafteraaaaaaaaaaaaaaaaaa", lab: { ...before.lab, score: 90, lcpMs: 1500, tbtMs: 300.4, cls: 0.1 },
  field: { ...before.field, inpMs: null } });

describe("compareAudits (SYNTHETIC)", () => {
  const r = compareAudits(before, after);
  if (!r.ok) throw new Error(r.reason);
  const get = (s: string, k: string) => r.deltas.find((d) => d.def.source === s && d.def.key === k);
  it("computes deltas and verdicts with correct direction", () => {
    expect(get("lab", "score")).toMatchObject({ delta: 10, verdict: "improved" });
    expect(get("lab", "lcp")).toMatchObject({ delta: -500, pct: -25, verdict: "improved" });
    expect(get("lab", "cls")?.verdict).toBe("regressed");
    expect(get("lab", "tbt")?.verdict).toBe("unchanged");
  });
  it("keeps lab and field separate and marks missing values not comparable", () => {
    expect(get("field", "inp")).toMatchObject({ delta: null, verdict: "not_comparable" });
    expect(r.deltas.filter((d) => d.def.source === "lab")).toHaveLength(7);
    expect(r.deltas.filter((d) => d.def.source === "field")).toHaveLength(5);
  });
  it("rejects different URL/strategy, unfinished, or identical audits", () => {
    expect(compareAudits(before, { ...after, strategy: "desktop" }).ok).toBe(false);
    expect(compareAudits(before, { ...after, url: "https://other.invalid/" }).ok).toBe(false);
    expect(compareAudits(before, { ...after, status: "FAILED" }).ok).toBe(false);
    expect(compareAudits(before, before).ok).toBe(false);
  });
  it("caveat mentions run-to-run variance", () => {
    expect(COMPARE_CAVEAT).toMatch(/single pair of runs does not prove/i);
    expect(COMPARE_CAVEAT).toMatch(/vary from run to run/i);
  });
});

describe("noise floor (SYNTHETIC)", () => {
  it("treats tiny real-world-style deltas as unchanged (CLS 0.119->0.118, 4ms->3ms, score +1)", () => {
    const b = syntheticAudit({ id: "cbeforebbbbbbbbbbbbbbbbb", lab: { score: 56, lcpMs: 3930, fcpMs: 3930, speedIndexMs: 4490, tbtMs: 707, cls: 0.119, ttfbMs: 4 } });
    const a = syntheticAudit({ id: "cafterbbbbbbbbbbbbbbbbbb", lab: { score: 57, lcpMs: 4000, fcpMs: 3930, speedIndexMs: 4490, tbtMs: 556, cls: 0.118, ttfbMs: 3 } });
    const r = compareAudits(b, a);
    if (!r.ok) throw new Error(r.reason);
    const v = (k: string) => r.deltas.find((d) => d.def.source === "lab" && d.def.key === k)?.verdict;
    expect(v("cls")).toBe("unchanged");
    expect(v("ttfb")).toBe("unchanged");
    expect(v("score")).toBe("unchanged");
    expect(v("lcp")).toBe("unchanged"); // +70ms on 3.93s < 5%
    expect(v("tbt")).toBe("improved");  // -151ms > 5%
  });
});
