export type FieldValue = { value: number; category: string | null } | null;
export type Opportunity = {
  id: string; title: string; description: string; score: number | null;
  displayValue: string | null; savingsMs: number | null; savingsBytes: number | null;
  metricSavings?: Record<string, number>;
};
export type AuditStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type AuditView = {
  id: string; url: string; strategy: "mobile" | "desktop"; status: AuditStatus;
  error: { code: string; message: string | null } | null;
  createdAt: string; startedAt: string | null; completedAt: string | null;
  finalUrl: string | null; lighthouseVersion: string | null; fetchTime: string | null;
  lab: { score: number | null; lcpMs: number | null; fcpMs: number | null; speedIndexMs: number | null; tbtMs: number | null; cls: number | null; ttfbMs: number | null };
  field: { scope: string | null; overall: string | null; lcpMs: FieldValue; inpMs: FieldValue; cls: FieldValue; fcpMs: FieldValue; ttfbMs: FieldValue };
  opportunities: Opportunity[];
};
export type BudgetView = {
  id: string; url: string; strategy: "mobile" | "desktop"; source: "lab" | "field";
  metric: string; threshold: number; createdAt: string;
};
