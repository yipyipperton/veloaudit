import type { Audit, Budget } from "@prisma/client";
import type { AuditView, BudgetView, CategoryView, Distribution, FieldKey, RunStatus, RunView } from "@/lib/types";
import type { AssetMeta, RunWithAudits } from "../persistence/audits";
import type { Opportunity } from "../recommendations/opportunities";

/** Public DTO. Null metrics mean "unavailable" and are never filled in. */
const NULL_SCORES = { lcp: null, fcp: null, si: null, tbt: null, cls: null };
const rec = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const scoreOf = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function distributions(v: unknown): Partial<Record<FieldKey, Distribution>> {
  const out: Partial<Record<FieldKey, Distribution>> = {};
  for (const k of ["lcp", "inp", "cls", "fcp", "ttfb"] as const) {
    const d = rec(v)[k];
    if (Array.isArray(d) && d.length === 3 && d.every((x) => typeof x === "number")) out[k] = d as Distribution;
  }
  return out;
}

export function toDto(a: Audit, assets: AssetMeta[] = []): AuditView {
  const shot = (m: AssetMeta) => ({ src: `/api/audits/${a.id}/screenshot?kind=${m.kind}&i=${m.idx}`, timingMs: m.timingMs });
  const final = assets.find((m) => m.kind === "final");
  const ms = rec(a.labMetricScores);
  const fm = (value: number | null, category: string | null) => (value === null ? null : { value, category });
  return {
    id: a.id, url: a.url, strategy: a.strategy === "MOBILE" ? "mobile" : "desktop", status: a.status,
    error: a.errorCode ? { code: a.errorCode, message: a.errorMessage } : null,
    createdAt: a.createdAt.toISOString(), startedAt: a.startedAt?.toISOString() ?? null, completedAt: a.completedAt?.toISOString() ?? null,
    finalUrl: a.finalUrl, lighthouseVersion: a.lighthouseVersion, fetchTime: a.fetchTime,
    lab: { score: a.labScore, lcpMs: a.labLcpMs, fcpMs: a.labFcpMs, speedIndexMs: a.labSpeedIndexMs, tbtMs: a.labTbtMs, cls: a.labCls, ttfbMs: a.labTtfbMs },
    field: {
      scope: a.fieldScope, overall: a.fieldOverall,
      lcpMs: fm(a.fieldLcpMs, a.fieldLcpCategory), inpMs: fm(a.fieldInpMs, a.fieldInpCategory), cls: fm(a.fieldCls, a.fieldClsCategory),
      fcpMs: fm(a.fieldFcpMs, a.fieldFcpCategory), ttfbMs: fm(a.fieldTtfbMs, a.fieldTtfbCategory),
    },
    opportunities: Array.isArray(a.opportunities) ? (a.opportunities as unknown as Opportunity[]) : [],
    diagnostics: Array.isArray(a.diagnostics) ? (a.diagnostics as unknown as Opportunity[]) : [],
    runId: a.runId,
    labMetricScores: a.labMetricScores ? { lcp: scoreOf(ms["lcp"]), fcp: scoreOf(ms["fcp"]), si: scoreOf(ms["si"]), tbt: scoreOf(ms["tbt"]), cls: scoreOf(ms["cls"]) } : NULL_SCORES,
    fieldDistributions: distributions(a.fieldDistributions),
    screenshots: { final: final ? shot(final) : null, thumbnails: assets.filter((m) => m.kind === "thumb").map(shot) },
    categoryScores: { performance: a.labScore, accessibility: a.accessibilityScore, bestPractices: a.bestPracticesScore, seo: a.seoScore },
    categories: Array.isArray(a.categories) ? (a.categories as unknown as CategoryView[]) : [],
  };
}

/** Aggregate status: terminal only once every device audit is terminal. */
export function runStatus(statuses: AuditView["status"][]): RunStatus {
  if (statuses.some((s) => s === "RUNNING")) return "RUNNING";
  if (statuses.some((s) => s === "QUEUED")) return statuses.some((s) => s !== "QUEUED") ? "RUNNING" : "QUEUED";
  if (statuses.every((s) => s === "SUCCEEDED")) return "SUCCEEDED";
  return statuses.some((s) => s === "SUCCEEDED") ? "PARTIAL" : "FAILED";
}

export function runDto(r: RunWithAudits): RunView {
  const audits = r.audits.map((a) => toDto(a, a.assets));
  return { id: r.id, url: r.url, createdAt: r.createdAt.toISOString(), status: runStatus(audits.map((a) => a.status)), audits };
}

export function budgetDto(b: Budget): BudgetView {
  return {
    id: b.id, url: b.url, strategy: b.strategy === "MOBILE" ? "mobile" : "desktop",
    source: b.source === "LAB" ? "lab" : "field", metric: b.metric, threshold: b.threshold, createdAt: b.createdAt.toISOString(),
  };
}
