import { describe, expect, it } from "vitest";
import { decodeImage, parsePsiResponse } from "@/server/psi/parser";
import { extractTable } from "@/server/recommendations/opportunities";
import { assessCwv, categoryRating, scoreRating } from "@/lib/cwv";
import { runStatus } from "@/server/http/serialize";
import { SYNTHETIC_PNG_DATA_URI, SYNTHETIC_PSI_WITH_FIELD } from "../fixtures/psi-synthetic";
import { syntheticAudit } from "./helpers";

const parsed = () => parsePsiResponse(structuredClone(SYNTHETIC_PSI_WITH_FIELD));

describe("PSI report parsing (SYNTHETIC fixture)", () => {
  it("keeps per-metric Lighthouse scores for threshold indicators", () => {
    expect(parsed().labMetricScores).toEqual({ lcp: 0.5, fcp: 0.8, si: 0.7, tbt: 0.6, cls: 1 });
  });
  it("keeps only well-formed 3-bucket CrUX distributions (never estimates missing ones)", () => {
    const d = parsed().fieldDistributions;
    expect(d.lcp).toEqual([0.7, 0.2, 0.1]);
    expect(d.inp).toBeUndefined(); // only 2 buckets in fixture
    expect(d.cls).toBeUndefined(); // no histogram reported
  });
  it("decodes final screenshot and filmstrip from Lighthouse data URIs, dropping non-image payloads", () => {
    const s = parsed().screenshots;
    expect(s.final?.mime).toBe("image/png");
    expect(s.final?.data.subarray(1, 4).toString()).toBe("PNG");
    expect(s.thumbnails.map((t) => t.timingMs)).toEqual([300, 900]);
  });
  it("rejects svg/html/oversized/garbage data URIs", () => {
    expect(decodeImage("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(decodeImage("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(decodeImage("https://example.com/x.png")).toBeNull();
    expect(decodeImage(`data:image/png;base64,${"A".repeat(3_000_001)}`)).toBeNull();
    expect(decodeImage(SYNTHETIC_PNG_DATA_URI)).not.toBeNull();
  });
  it("splits failing audits into opportunities (with savings) and diagnostics (without)", () => {
    const p = parsed();
    expect(p.opportunities.map((o) => o.id)).toEqual(["render-blocking-resources", "unused-javascript"]);
    expect(p.diagnostics.map((o) => o.id)).toEqual(["dom-size"]);
    expect(p.diagnostics[0]?.table).toEqual({ headings: ["Statistic", "Value"], rows: [["Total DOM Elements", "2,000"]] });
  });
  it("extracts tables from LH13 list details and formats bytes/ms", () => {
    const t = extractTable({ type: "list", items: [{ type: "table", headings: [{ key: "url", label: "URL", valueType: "url" }, { key: "totalBytes", label: "Size", valueType: "bytes" }, { key: "wastedMs", label: "Time", valueType: "timespanMs" }], items: [{ url: "https://x.invalid/a.css", totalBytes: 2048, wastedMs: 1234.4 }] }] });
    expect(t).toEqual({ headings: ["URL", "Size", "Time"], rows: [["https://x.invalid/a.css", "2.0 KiB", "1,234 ms"]] });
    expect(extractTable({ type: "table", headings: [], items: [] })).toBeUndefined();
  });
});

describe("Core Web Vitals assessment (field data only)", () => {
  const f = syntheticAudit().field;
  it("fails when any core metric is not good", () => expect(assessCwv(f)).toBe("failed")); // INP AVERAGE
  it("passes when LCP, INP and CLS are all good", () => expect(assessCwv({ ...f, inpMs: { value: 150, category: "FAST" } })).toBe("passed"));
  it("passes on LCP + CLS when INP has insufficient data", () => expect(assessCwv({ ...f, inpMs: null })).toBe("passed"));
  it("is not available without CrUX data, regardless of lab results", () => {
    expect(assessCwv({ scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null })).toBe("no_data");
    expect(assessCwv({ ...f, cls: null })).toBe("no_data");
  });
  it("maps scores and categories to PSI bands", () => {
    expect([scoreRating(0.95), scoreRating(0.5), scoreRating(0.49), scoreRating(null), scoreRating(90, 100)]).toEqual(["good", "ni", "poor", "none", "good"]);
    expect([categoryRating("FAST"), categoryRating("AVERAGE"), categoryRating("SLOW"), categoryRating(null)]).toEqual(["good", "ni", "poor", "none"]);
  });
});

describe("run status aggregation", () => {
  it.each([
    [["QUEUED", "QUEUED"], "QUEUED"], [["RUNNING", "QUEUED"], "RUNNING"], [["SUCCEEDED", "QUEUED"], "RUNNING"],
    [["SUCCEEDED", "SUCCEEDED"], "SUCCEEDED"], [["SUCCEEDED", "FAILED"], "PARTIAL"], [["FAILED", "FAILED"], "FAILED"],
  ] as const)("%j -> %s", (s, want) => expect(runStatus([...s])).toBe(want));
});
