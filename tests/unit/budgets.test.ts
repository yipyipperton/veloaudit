import { describe, expect, it } from "vitest";
import { evaluateBudget, evaluateBudgets, summarize } from "@/lib/budgets";
import { CreateBudgetSchema } from "@/server/validation/budgets";
import { syntheticAudit } from "./helpers";

const noField = syntheticAudit({ field: { scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null } });

describe("evaluateBudget (SYNTHETIC audits)", () => {
  it("passes lower-is-better metrics at or under the target", () => {
    expect(evaluateBudget({ source: "lab", metric: "lcp", threshold: 2000 }, syntheticAudit()).status).toBe("pass");
    expect(evaluateBudget({ source: "lab", metric: "lcp", threshold: 1999 }, syntheticAudit()).status).toBe("fail");
  });
  it("score is higher-is-better", () => {
    const r = evaluateBudget({ source: "lab", metric: "score", threshold: 90 }, syntheticAudit());
    expect(r.comparator).toBe(">=");
    expect(r.status).toBe("fail");
    expect(evaluateBudget({ source: "lab", metric: "score", threshold: 80 }, syntheticAudit()).status).toBe("pass");
  });
  it("uses only the declared source (field LCP vs lab LCP differ)", () => {
    const a = syntheticAudit();
    expect(evaluateBudget({ source: "lab", metric: "lcp", threshold: 2200 }, a)).toMatchObject({ status: "pass", actual: 2000 });
    expect(evaluateBudget({ source: "field", metric: "lcp", threshold: 2200 }, a)).toMatchObject({ status: "fail", actual: 2400 });
  });
  it("missing field data is NOT EVALUABLE, never pass — even if lab has a value", () => {
    for (const metric of ["lcp", "inp", "cls", "fcp", "ttfb"]) {
      const r = evaluateBudget({ source: "field", metric, threshold: 1e9 }, noField);
      expect(r.status).toBe("not_evaluable");
      expect(r.actual).toBeNull();
    }
  });
  it("field INP is never filled in from lab TBT", () => {
    const r = evaluateBudget({ source: "field", metric: "inp", threshold: 500 }, noField);
    expect(r.status).toBe("not_evaluable");
    expect(noField.lab.tbtMs).toBe(300);
  });
  it("INP has no lab equivalent -> not evaluable for source=lab", () => {
    expect(evaluateBudget({ source: "lab", metric: "inp", threshold: 200 }, syntheticAudit()).status).toBe("not_evaluable");
  });
  it("unsuccessful audits are not evaluable", () => {
    expect(evaluateBudget({ source: "lab", metric: "lcp", threshold: 1e9 }, syntheticAudit({ status: "FAILED" })).status).toBe("not_evaluable");
  });
  it("null lab metric is not evaluable", () => {
    const a = syntheticAudit({ lab: { ...syntheticAudit().lab, cls: null } });
    expect(evaluateBudget({ source: "lab", metric: "cls", threshold: 0.1 }, a).status).toBe("not_evaluable");
  });
  it("summarize counts statuses", () => {
    const rs = evaluateBudgets([
      { source: "lab", metric: "lcp", threshold: 5000 }, { source: "lab", metric: "tbt", threshold: 100 }, { source: "field", metric: "inp", threshold: 200 },
    ], noField);
    expect(summarize(rs)).toEqual({ pass: 1, fail: 1, not_evaluable: 1 });
  });
});

describe("CreateBudgetSchema", () => {
  const base = { url: "https://example.com", strategy: "mobile", source: "field", metric: "inp", threshold: 200 };
  it("accepts valid budgets and normalizes URL", () => {
    const r = CreateBudgetSchema.safeParse(base);
    expect(r.success && r.data.url).toBe("https://example.com/");
  });
  it.each([
    [{ ...base, source: "lab", metric: "inp" }, /not a lab metric/],
    [{ ...base, metric: "score" }, /not a field metric/],
    [{ ...base, source: "lab", metric: "score", threshold: 101 }, /0-100/],
    [{ ...base, metric: "cls", threshold: 50 }, /CLS/],
    [{ ...base, threshold: -1 }, /./],
    [{ ...base, url: "http://127.0.0.1/" }, /Private/],
    [{ ...base, source: "synthetic" }, /./],
    [{ ...base, extra: true }, /./],
  ])("rejects %j", (input, re) => {
    const r = CreateBudgetSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message).join(" ")).toMatch(re);
  });
});
