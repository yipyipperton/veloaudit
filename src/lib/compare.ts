import { ALL_METRICS, type MetricDef } from "./metrics";
import type { AuditView } from "./types";

export type Verdict = "improved" | "regressed" | "unchanged" | "not_comparable";
export type MetricDelta = {
  def: Pick<MetricDef, "source" | "key" | "label" | "unit" | "better">;
  before: number | null;
  after: number | null;
  delta: number | null;
  pct: number | null;
  verdict: Verdict;
};

/**
 * Deltas smaller than these are reported as "unchanged" (within typical noise), not as improvements/regressions.
 * ms: max(10 ms, 5% of the baseline); score: < 2 points; CLS: < 0.01.
 */
export function noiseFloor(unit: MetricDef["unit"], before: number): number {
  if (unit === "ms") return Math.max(10, Math.abs(before) * 0.05);
  if (unit === "score") return 2;
  return 0.01;
}

export const COMPARE_CAVEAT =
  "A single pair of runs does not prove an improvement or regression. Lighthouse lab results vary from run to run " +
  "(network, CPU and server conditions), often by several points of score and hundreds of ms on mobile. Field (CrUX) data is " +
  "a rolling 28-day p75 aggregate, so two audits taken close together may show identical field values. Repeat runs and look at trends before drawing conclusions.";

export type CompareResult = { ok: true; deltas: MetricDelta[] } | { ok: false; reason: string };

/** Compare two completed audits of the same URL + strategy. `before` should be the older run. */
export function compareAudits(before: AuditView, after: AuditView): CompareResult {
  if (before.status !== "SUCCEEDED" || after.status !== "SUCCEEDED") return { ok: false, reason: "Both audits must have completed successfully" };
  if (before.url !== after.url || before.strategy !== after.strategy) return { ok: false, reason: "Audits must be for the same URL and strategy" };
  if (before.id === after.id) return { ok: false, reason: "Choose two different audits" };
  const deltas = ALL_METRICS.map((m): MetricDelta => {
    const b = m.get(before), a = m.get(after);
    const def = { source: m.source, key: m.key, label: m.label, unit: m.unit, better: m.better };
    if (b === null || a === null) return { def, before: b, after: a, delta: null, pct: null, verdict: "not_comparable" };
    const delta = a - b;
    const pct = b !== 0 ? (delta / b) * 100 : null;
    const verdict: Verdict = Math.abs(delta) < noiseFloor(m.unit, b) ? "unchanged"
      : (m.better === "lower" ? delta < 0 : delta > 0) ? "improved" : "regressed";
    return { def, before: b, after: a, delta, pct, verdict };
  });
  return { ok: true, deltas };
}
