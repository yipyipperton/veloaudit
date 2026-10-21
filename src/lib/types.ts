export type FieldValue = { value: number; category: string | null } | null;
export type Opportunity = {
  id: string; title: string; description: string; score: number | null;
  displayValue: string | null; savingsMs: number | null; savingsBytes: number | null;
  metricSavings?: Record<string, number>;
  table?: { headings: string[]; rows: string[][] };
};
/** [good, needs improvement, poor] proportions from the CrUX histogram. */
export type Distribution = [number, number, number];
export type FieldKey = "lcp" | "inp" | "cls" | "fcp" | "ttfb";
export type Screenshot = { src: string; timingMs: number | null };
export type AuditStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type AuditView = {
  id: string; url: string; strategy: "mobile" | "desktop"; status: AuditStatus;
  error: { code: string; message: string | null } | null;
  createdAt: string; startedAt: string | null; completedAt: string | null;
  finalUrl: string | null; lighthouseVersion: string | null; fetchTime: string | null;
  lab: { score: number | null; lcpMs: number | null; fcpMs: number | null; speedIndexMs: number | null; tbtMs: number | null; cls: number | null; ttfbMs: number | null };
  field: { scope: string | null; overall: string | null; lcpMs: FieldValue; inpMs: FieldValue; cls: FieldValue; fcpMs: FieldValue; ttfbMs: FieldValue };
  opportunities: Opportunity[];
  diagnostics: Opportunity[];
  runId: string | null;
  labMetricScores: { lcp: number | null; fcp: number | null; si: number | null; tbt: number | null; cls: number | null };
  fieldDistributions: Partial<Record<FieldKey, Distribution>>;
  screenshots: { final: Screenshot | null; thumbnails: Screenshot[] };
  /** Category scores 0-100; performance mirrors lab.score. Null for audits that predate categories. */
  categoryScores: CategoryScores;
  /** Non-empty only for audits run with all four categories. */
  categories: CategoryView[];
};
export type CategoryId = "performance" | "accessibility" | "best-practices" | "seo";
export type CategoryFinding = Opportunity & { group: string | null; weight?: number };
export type CategoryView = {
  id: CategoryId; title: string; score: number | null;
  failed: CategoryFinding[];
  passed: { id: string; title: string }[];
  manual: { id: string; title: string; description: string }[];
  notApplicable: { id: string; title: string }[];
};
export type CategoryScores = { performance: number | null; accessibility: number | null; bestPractices: number | null; seo: number | null };
export type RunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED";
export type RunView = { id: string; url: string; createdAt: string; status: RunStatus; audits: AuditView[] };
export type BudgetView = {
  id: string; url: string; strategy: "mobile" | "desktop"; source: "lab" | "field";
  metric: string; threshold: number; createdAt: string;
};
