import type { PsiResponse } from "./schema";
import { extractTable, type Opportunity } from "../recommendations/opportunities";

export const CATEGORY_IDS = ["performance", "accessibility", "best-practices", "seo"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type CategoryAuditRef = { id: string; title: string };
export type CategoryFinding = Opportunity & { group: string | null; weight: number };
/** One Lighthouse category, grouped the way PSI's report does (failed / passed / manual / not applicable). */
export type CategoryResult = {
  id: CategoryId;
  title: string;
  /** 0-100, null when Lighthouse could not score the category. */
  score: number | null;
  failed: CategoryFinding[];
  passed: CategoryAuditRef[];
  manual: (CategoryAuditRef & { description: string })[];
  notApplicable: CategoryAuditRef[];
};

const PASS = 0.9; // Lighthouse report renderer threshold (ReportUtils.PASS_THRESHOLD)
const clean = (d: string | undefined) => (d ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();

/**
 * Classify a category's auditRefs like the Lighthouse/PSI report renderer: `hidden` group refs are skipped;
 * manual -> manual checks; notApplicable -> not applicable; score >= 0.9 -> passed; anything else (including
 * error/null-score audits) -> failed. Performance keeps its own opportunity/diagnostic split elsewhere.
 */
export function parseCategories(lr: PsiResponse["lighthouseResult"]): CategoryResult[] {
  const groups = (lr as { categoryGroups?: Record<string, { title?: unknown }> }).categoryGroups ?? {};
  const out: CategoryResult[] = [];
  for (const id of CATEGORY_IDS) {
    const c = lr.categories[id] as { title?: unknown; score?: unknown; auditRefs?: unknown } | undefined;
    if (!c) continue;
    const refs = Array.isArray(c.auditRefs) ? (c.auditRefs as { id?: unknown; group?: unknown; weight?: unknown }[]) : [];
    const res: CategoryResult = {
      id, title: typeof c.title === "string" ? c.title : id,
      score: typeof c.score === "number" && Number.isFinite(c.score) ? Math.round(c.score * 100) : null,
      failed: [], passed: [], manual: [], notApplicable: [],
    };
    for (const r of refs) {
      if (typeof r.id !== "string" || r.group === "hidden") continue;
      const a = lr.audits[r.id];
      if (!a) continue;
      const ref = { id: a.id, title: a.title };
      if (a.scoreDisplayMode === "manual") res.manual.push({ ...ref, description: clean(a.description) });
      else if (a.scoreDisplayMode === "notApplicable") res.notApplicable.push(ref);
      else if (typeof a.score === "number" && a.score >= PASS) res.passed.push(ref);
      else {
        const g = typeof r.group === "string" ? groups[r.group]?.title : undefined;
        const table = extractTable(a.details);
        res.failed.push({
          id: a.id, title: a.title, description: clean(a.description), score: a.score ?? null,
          displayValue: a.displayValue ?? (a.scoreDisplayMode === "error" ? "Lighthouse error" : null),
          savingsMs: null, savingsBytes: null, metricSavings: a.metricSavings ?? {},
          group: typeof g === "string" ? g : null, weight: typeof r.weight === "number" ? r.weight : 0, ...(table ? { table } : {}),
        });
      }
    }
    // PSI order: heaviest auditRef weight first (largest score impact).
    res.failed.sort((x, y) => y.weight - x.weight); // stable: ties keep Lighthouse auditRefs order, as PSI shows them
    out.push(res);
  }
  return out;
}
