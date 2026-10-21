import type { AuditView } from "./types";

export type MetricSource = "lab" | "field";
export type MetricUnit = "ms" | "score" | "unitless";
export type MetricDef = {
  source: MetricSource;
  key: string;
  label: string;
  unit: MetricUnit;
  better: "higher" | "lower";
  /** Real measured value or null when unavailable. Never derived from another metric. */
  get: (a: AuditView) => number | null;
};

export const LAB_METRICS: readonly MetricDef[] = [
  { source: "lab", key: "score", label: "Performance score", unit: "score", better: "higher", get: (a) => a.lab.score },
  { source: "lab", key: "lcp", label: "LCP", unit: "ms", better: "lower", get: (a) => a.lab.lcpMs },
  { source: "lab", key: "fcp", label: "FCP", unit: "ms", better: "lower", get: (a) => a.lab.fcpMs },
  { source: "lab", key: "si", label: "Speed Index", unit: "ms", better: "lower", get: (a) => a.lab.speedIndexMs },
  { source: "lab", key: "tbt", label: "TBT", unit: "ms", better: "lower", get: (a) => a.lab.tbtMs },
  { source: "lab", key: "cls", label: "CLS", unit: "unitless", better: "lower", get: (a) => a.lab.cls },
  { source: "lab", key: "ttfb", label: "Server response (backend only)", unit: "ms", better: "lower", get: (a) => a.lab.ttfbMs },
  // Lighthouse category scores (lab). Budget keys stay <= 16 chars.
  { source: "lab", key: "accessibility", label: "Accessibility score", unit: "score", better: "higher", get: (a) => a.categoryScores?.accessibility ?? null },
  { source: "lab", key: "best-practices", label: "Best Practices score", unit: "score", better: "higher", get: (a) => a.categoryScores?.bestPractices ?? null },
  { source: "lab", key: "seo", label: "SEO score", unit: "score", better: "higher", get: (a) => a.categoryScores?.seo ?? null },
];

export const FIELD_METRICS: readonly MetricDef[] = [
  { source: "field", key: "lcp", label: "LCP (p75)", unit: "ms", better: "lower", get: (a) => a.field.lcpMs?.value ?? null },
  { source: "field", key: "inp", label: "INP (p75)", unit: "ms", better: "lower", get: (a) => a.field.inpMs?.value ?? null },
  { source: "field", key: "cls", label: "CLS (p75)", unit: "unitless", better: "lower", get: (a) => a.field.cls?.value ?? null },
  { source: "field", key: "fcp", label: "FCP (p75)", unit: "ms", better: "lower", get: (a) => a.field.fcpMs?.value ?? null },
  { source: "field", key: "ttfb", label: "TTFB (p75)", unit: "ms", better: "lower", get: (a) => a.field.ttfbMs?.value ?? null },
];

export const ALL_METRICS: readonly MetricDef[] = [...LAB_METRICS, ...FIELD_METRICS];

export function findMetric(source: MetricSource, key: string): MetricDef | undefined {
  return ALL_METRICS.find((m) => m.source === source && m.key === key);
}

export function formatValue(v: number | null | undefined, unit: MetricUnit): string {
  if (v === null || v === undefined) return "Unavailable";
  if (unit === "score") return String(Math.round(v));
  if (unit === "unitless") return v.toFixed(3);
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
}

export function formatDelta(d: number, unit: MetricUnit): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  const abs = Math.abs(d);
  if (unit === "score") return `${sign}${Math.round(abs)}`;
  if (unit === "unitless") return `${sign}${abs.toFixed(3)}`;
  return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(2)} s` : `${sign}${Math.round(abs)} ms`;
}
