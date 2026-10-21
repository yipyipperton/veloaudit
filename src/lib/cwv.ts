import type { AuditView } from "./types";

export type CwvAssessment = "passed" | "failed" | "no_data";

/**
 * Core Web Vitals assessment from CrUX field data only (never lab data), following the PSI rule:
 * passes when the p75 of LCP, INP and CLS are all "good"; if INP has insufficient data, LCP and CLS
 * must both be good. LCP and CLS are required; without them the assessment is not available.
 */
export function assessCwv(field: AuditView["field"]): CwvAssessment {
  if (field.scope === null || !field.lcpMs || !field.cls) return "no_data";
  const core = [field.lcpMs, field.cls, ...(field.inpMs ? [field.inpMs] : [])];
  if (core.some((m) => m.category === null)) return "no_data";
  return core.every((m) => m.category === "FAST") ? "passed" : "failed";
}

/** PSI/Lighthouse score bands: 90-100 good, 50-89 needs improvement, 0-49 poor. */
export type Rating = "good" | "ni" | "poor" | "none";
export function scoreRating(score01OrPct: number | null, scale: 1 | 100 = 1): Rating {
  if (score01OrPct === null) return "none";
  const s = score01OrPct / scale;
  return s >= 0.9 ? "good" : s >= 0.5 ? "ni" : "poor";
}
export function categoryRating(c: string | null | undefined): Rating {
  return c === "FAST" ? "good" : c === "AVERAGE" ? "ni" : c === "SLOW" ? "poor" : "none";
}
