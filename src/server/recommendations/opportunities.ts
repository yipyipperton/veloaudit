import type { LhAudit } from "../psi/schema";

/** A compact, display-ready row from a Lighthouse audit's `details.items` table (values pre-formatted). */
export type FindingTable = { headings: string[]; rows: string[][] };

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue: string | null;
  savingsMs: number | null;
  savingsBytes: number | null;
  metricSavings: Record<string, number>;
  /** Up to MAX_ROWS rows copied from Lighthouse details; absent when Lighthouse reported none. */
  table?: FindingTable;
};

const METRIC_AUDIT_IDS = new Set([
  "largest-contentful-paint", "first-contentful-paint", "speed-index", "total-blocking-time",
  "cumulative-layout-shift", "interactive", "max-potential-fid", "server-response-time",
]);
/** Screenshot/trace plumbing audits, not user-facing findings. */
const NON_FINDING_IDS = new Set(["final-screenshot", "screenshot-thumbnails", "full-page-screenshot", "main-thread-tasks", "network-requests", "network-rtt", "network-server-latency", "metrics", "diagnostics", "script-treemap-data", "resource-summary"]);
const MAX_ROWS = 5;
const MAX_CELL = 160;

/** Strip Lighthouse markdown links "[text](url)" -> "text" for compact display. */
function cleanDescription(d: string | undefined): string {
  return (d ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

/** Largest reported time saving across metrics (LCP/FCP/TBT/INP); CLS is unitless and excluded. */
function bestSavingsMs(overall: number | undefined, ms: Record<string, number>): number | null {
  const vals = [overall, ms["LCP"], ms["FCP"], ms["TBT"], ms["INP"]].filter((v): v is number => typeof v === "number" && v > 0);
  return vals.length ? Math.max(...vals) : null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const clip = (s: string) => (s.length > MAX_CELL ? `${s.slice(0, MAX_CELL - 1)}…` : s);

function formatCell(v: unknown, valueType: string | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    if (valueType === "bytes") return `${(v / 1024).toFixed(1)} KiB`;
    if (valueType === "ms" || valueType === "timespanMs") return `${Math.round(v).toLocaleString("en-US")} ms`;
    return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(3);
  }
  if (typeof v === "string") return clip(v);
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (isRecord(v)) {
    // node / source-location / url / text sub-objects
    for (const k of ["nodeLabel", "snippet", "url", "text", "value", "selector"]) {
      const x = v[k];
      if (typeof x === "string" && x) return clip(x);
    }
  }
  return "";
}

type Heading = { key: string; label: string; valueType?: string };
function headingsOf(d: Record<string, unknown>): Heading[] {
  const hs = Array.isArray(d["headings"]) ? d["headings"] : [];
  const out: Heading[] = [];
  for (const h of hs) {
    if (!isRecord(h)) continue;
    const key = typeof h["key"] === "string" ? h["key"] : null;
    const label = typeof h["label"] === "string" ? h["label"] : typeof h["text"] === "string" ? h["text"] : null;
    if (key && label) out.push({ key, label, valueType: typeof h["valueType"] === "string" ? h["valueType"] : typeof h["itemType"] === "string" ? h["itemType"] : undefined });
  }
  return out;
}

/** Extract a small table from details (handles `table`/`opportunity` and the LH13 `list` of sub-tables). */
export function extractTable(details: unknown): FindingTable | undefined {
  if (!isRecord(details)) return undefined;
  let d: Record<string, unknown> = details;
  if (d["type"] === "list" && Array.isArray(d["items"])) {
    const sub = d["items"].find((x): x is Record<string, unknown> => isRecord(x) && Array.isArray(x["items"]) && x["items"].length > 0);
    if (!sub) return undefined;
    d = sub;
  }
  const items = Array.isArray(d["items"]) ? d["items"].filter(isRecord) : [];
  const hs = headingsOf(d).slice(0, 4);
  if (items.length === 0 || hs.length === 0) return undefined;
  const rows = items.slice(0, MAX_ROWS).map((it) => hs.map((h) => formatCell(it[h.key], h.valueType))).filter((r) => r.some((c) => c !== ""));
  return rows.length ? { headings: hs.map((h) => h.label), rows } : undefined;
}

function toFinding(a: LhAudit): Opportunity {
  const ms = a.metricSavings ?? {};
  const table = extractTable(a.details);
  return {
    id: a.id, title: a.title, description: cleanDescription(a.description), score: a.score ?? null,
    displayValue: a.displayValue ?? null, savingsMs: bestSavingsMs(a.details?.overallSavingsMs, ms),
    savingsBytes: a.details?.overallSavingsBytes ?? null, metricSavings: ms, ...(table ? { table } : {}),
  };
}

const failing = (a: LhAudit) =>
  !METRIC_AUDIT_IDS.has(a.id) && !NON_FINDING_IDS.has(a.id) && a.score !== null && a.score !== undefined && a.score < 0.9 &&
  a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "manual";
const isOpportunity = (a: LhAudit) => a.details?.type === "opportunity" || Object.values(a.metricSavings ?? {}).some((v) => v > 0);

/**
 * Opportunities derived ONLY from real Lighthouse audits: failing (score < 0.9) audits that are
 * either `opportunity`-type or report non-zero metric savings. Sorted by estimated ms savings.
 */
export function extractOpportunities(audits: Record<string, LhAudit>): Opportunity[] {
  return Object.values(audits).filter((a) => failing(a) && isOpportunity(a)).map(toFinding)
    .sort((x, y) => (y.savingsMs ?? 0) - (x.savingsMs ?? 0) || (x.score ?? 1) - (y.score ?? 1));
}

/** Diagnostics: failing Lighthouse audits WITHOUT estimated metric savings (still worth investigating). */
export function extractDiagnostics(audits: Record<string, LhAudit>): Opportunity[] {
  return Object.values(audits).filter((a) => failing(a) && !isOpportunity(a)).map(toFinding)
    .sort((x, y) => (x.score ?? 1) - (y.score ?? 1) || x.title.localeCompare(y.title));
}
