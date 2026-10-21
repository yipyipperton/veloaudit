import type { LhAudit } from "../psi/schema";

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue: string | null;
  savingsMs: number | null;
  savingsBytes: number | null;
  metricSavings: Record<string, number>;
};

const METRIC_AUDIT_IDS = new Set([
  "largest-contentful-paint", "first-contentful-paint", "speed-index", "total-blocking-time",
  "cumulative-layout-shift", "interactive", "max-potential-fid", "server-response-time",
]);

/** Strip Lighthouse markdown links "[text](url)" -> "text" for compact display. */
function cleanDescription(d: string | undefined): string {
  return (d ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

/** Largest reported time saving across metrics (LCP/FCP/TBT/INP); CLS is unitless and excluded. */
function bestSavingsMs(overall: number | undefined, ms: Record<string, number>): number | null {
  const vals = [overall, ms["LCP"], ms["FCP"], ms["TBT"], ms["INP"]].filter((v): v is number => typeof v === "number" && v > 0);
  return vals.length ? Math.max(...vals) : null;
}

/**
 * Opportunities derived ONLY from real Lighthouse audits: failing (score < 0.9) audits that are
 * either `opportunity`-type or report non-zero metric savings. Sorted by estimated ms savings.
 */
export function extractOpportunities(audits: Record<string, LhAudit>): Opportunity[] {
  const out: Opportunity[] = [];
  for (const a of Object.values(audits)) {
    if (METRIC_AUDIT_IDS.has(a.id)) continue;
    if (a.score === null || a.score === undefined || a.score >= 0.9) continue;
    if (a.scoreDisplayMode === "notApplicable" || a.scoreDisplayMode === "informative" || a.scoreDisplayMode === "manual") continue;
    const ms = a.metricSavings ?? {};
    const hasSavings = Object.values(ms).some((v) => v > 0);
    const isOpp = a.details?.type === "opportunity";
    if (!isOpp && !hasSavings) continue;
    out.push({
      id: a.id,
      title: a.title,
      description: cleanDescription(a.description),
      score: a.score,
      displayValue: a.displayValue ?? null,
      savingsMs: bestSavingsMs(a.details?.overallSavingsMs, ms),
      savingsBytes: a.details?.overallSavingsBytes ?? null,
      metricSavings: ms,
    });
  }
  return out.sort((x, y) => (y.savingsMs ?? 0) - (x.savingsMs ?? 0) || (x.score ?? 1) - (y.score ?? 1));
}
