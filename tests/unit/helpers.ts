import type { AuditView } from "@/lib/types";

/** SYNTHETIC audit DTO builder for pure-logic tests. Values are invented. */
export function syntheticAudit(over: Partial<AuditView> = {}): AuditView {
  return {
    id: "csyntheticaaaaaaaaaaaaaaa", url: "https://synthetic.invalid/", strategy: "mobile", status: "SUCCEEDED", error: null,
    createdAt: "2000-01-01T00:00:00.000Z", startedAt: null, completedAt: "2000-01-01T00:01:00.000Z",
    finalUrl: null, lighthouseVersion: "SYNTHETIC", fetchTime: null,
    lab: { score: 80, lcpMs: 2000, fcpMs: 1200, speedIndexMs: 2500, tbtMs: 300, cls: 0.05, ttfbMs: 40 },
    field: { scope: "url", overall: "AVERAGE", lcpMs: { value: 2400, category: "FAST" }, inpMs: { value: 210, category: "AVERAGE" },
      cls: { value: 0.08, category: "FAST" }, fcpMs: { value: 1500, category: "FAST" }, ttfbMs: { value: 600, category: "FAST" } },
    opportunities: [],
    ...over,
  };
}
