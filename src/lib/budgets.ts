import { findMetric, type MetricSource } from "./metrics";
import type { AuditView } from "./types";

export type BudgetInput = { source: MetricSource; metric: string; threshold: number };
export type BudgetStatus = "pass" | "fail" | "not_evaluable";
export type BudgetResult = {
  source: MetricSource;
  metric: string;
  label: string;
  threshold: number;
  comparator: "<=" | ">=";
  actual: number | null;
  status: BudgetStatus;
  reason: string;
};

/**
 * Evaluate one budget against one audit using ONLY the budget's declared source.
 * Missing data => "not_evaluable" (never "pass"); lab values are never used for field budgets or vice versa.
 */
export function evaluateBudget(b: BudgetInput, audit: AuditView): BudgetResult {
  const def = findMetric(b.source, b.metric);
  const comparator = def?.better === "higher" ? ">=" : "<=";
  const base = { source: b.source, metric: b.metric, label: def?.label ?? b.metric, threshold: b.threshold, comparator } as const;
  if (!def) return { ...base, actual: null, status: "not_evaluable", reason: `Unknown ${b.source} metric "${b.metric}"` };
  if (audit.status !== "SUCCEEDED") return { ...base, actual: null, status: "not_evaluable", reason: "Audit has not completed successfully" };
  const actual = def.get(audit);
  if (actual === null || !Number.isFinite(actual))
    return { ...base, actual: null, status: "not_evaluable", reason: `${b.source === "field" ? "Field (CrUX)" : "Lab"} value unavailable for this audit` };
  const pass = def.better === "higher" ? actual >= b.threshold : actual <= b.threshold;
  return { ...base, actual, status: pass ? "pass" : "fail", reason: pass ? "Within budget" : "Over budget" };
}

export function evaluateBudgets(budgets: readonly BudgetInput[], audit: AuditView): BudgetResult[] {
  return budgets.map((b) => evaluateBudget(b, audit));
}

export function summarize(results: readonly BudgetResult[]): Record<BudgetStatus, number> {
  const s: Record<BudgetStatus, number> = { pass: 0, fail: 0, not_evaluable: 0 };
  for (const r of results) s[r.status]++;
  return s;
}
