import type { Audit, Budget } from "@prisma/client";
import type { AuditView, BudgetView } from "@/lib/types";
import type { Opportunity } from "../recommendations/opportunities";

/** Public DTO. Null metrics mean "unavailable" and are never filled in. */
export function toDto(a: Audit): AuditView {
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
  };
}

export function budgetDto(b: Budget): BudgetView {
  return {
    id: b.id, url: b.url, strategy: b.strategy === "MOBILE" ? "mobile" : "desktop",
    source: b.source === "LAB" ? "lab" : "field", metric: b.metric, threshold: b.threshold, createdAt: b.createdAt.toISOString(),
  };
}
