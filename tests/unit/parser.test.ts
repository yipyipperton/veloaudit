import { describe, expect, it } from "vitest";
import { parsePsiResponse, PsiParseError } from "@/server/psi/parser";
import { SYNTHETIC_PSI_NO_FIELD, SYNTHETIC_PSI_WITH_FIELD } from "../fixtures/psi-synthetic";

describe("parsePsiResponse (SYNTHETIC fixtures)", () => {
  it("parses lab metrics and score", () => {
    const p = parsePsiResponse(SYNTHETIC_PSI_WITH_FIELD);
    expect(p.lab).toEqual({ score: 73, lcpMs: 3100, fcpMs: 1800, speedIndexMs: 4000, tbtMs: 450, cls: 0.02, ttfbMs: 120 });
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
