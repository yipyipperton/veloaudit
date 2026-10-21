"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FIELD_METRICS, LAB_METRICS, findMetric, formatValue, type MetricSource } from "@/lib/metrics";
import type { BudgetResult } from "@/lib/budgets";
import type { BudgetView } from "@/lib/types";
import { usePoll } from "./use-poll";

type Resp = { budgets: BudgetView[]; results: BudgetResult[]; evaluatedAuditId: string | null };
const BADGE: Record<BudgetResult["status"], string> = {
  pass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  fail: "bg-red-500/15 text-red-700 dark:text-red-300",
  not_evaluable: "bg-muted text-muted-foreground",
};
const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export function BudgetsPanel({ url, strategy, auditId }: { url: string; strategy: "mobile" | "desktop"; auditId?: string }) {
  const qs = new URLSearchParams({ url, strategy, ...(auditId ? { auditId } : {}) });
  const { data, error, reload } = usePoll<Resp>(`/api/budgets?${qs.toString()}`, 0, () => false);
  const [source, setSource] = useState<MetricSource>("field");
  const [metric, setMetric] = useState("lcp");
  const [threshold, setThreshold] = useState("2500");
  const [formError, setFormError] = useState<string | null>(null);
  const metrics = source === "lab" ? LAB_METRICS : FIELD_METRICS;

  async function add(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    const res = await fetch("/api/budgets", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, strategy, source, metric, threshold: Number(threshold) }) });
    if (!res.ok) { setFormError(((await res.json()) as { error?: { message?: string } }).error?.message ?? "Failed"); return; }
    reload();
  }
  async function remove(id: string) { await fetch(`/api/budgets/${id}`, { method: "DELETE" }); reload(); }

  return (
    <div className="space-y-4" data-testid="budgets">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && data.results.length === 0 && <p className="text-sm text-muted-foreground">No budgets yet for this URL and strategy.</p>}
      {data && data.results.length > 0 && (
        <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
          {data.results.map((r, i) => {
            const unit = findMetric(r.source, r.metric)?.unit ?? "ms";
            const id = data.budgets[i]?.id;
            return (
              <li key={`${r.source}-${r.metric}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm" data-testid={`budget-${r.source}-${r.metric}`}>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">{r.source}</Badge>
                <span className="font-medium">{findMetric(r.source, r.metric)?.label ?? r.metric}</span>
                <span className="font-mono text-xs text-muted-foreground">{r.comparator ?? "<="} {formatValue(r.threshold, unit)}</span>
                <span className="font-mono text-xs">actual {formatValue(r.actual, unit)}</span>
                <Badge variant="outline" className={`border-transparent ${BADGE[r.status]}`} data-testid="budget-status">{r.status === "not_evaluable" ? "not evaluable" : r.status}</Badge>
                {r.status === "not_evaluable" && <span className="text-xs text-muted-foreground">{r.reason}</span>}
                {id && <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label="Delete budget" onClick={() => void remove(id)}><Trash2 className="size-3.5" /></Button>}
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2" aria-label="Add budget">
        <label className="grid gap-1 text-xs text-muted-foreground">Source
          <select aria-label="Budget source" className={selectCls} value={source} onChange={(e) => { const s = e.target.value as MetricSource; setSource(s); setMetric((s === "lab" ? LAB_METRICS : FIELD_METRICS)[0]?.key ?? "lcp"); }}>
            <option value="field">Field (CrUX)</option><option value="lab">Lab (Lighthouse)</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">Metric
          <select aria-label="Budget metric" className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">Target ({findMetric(source, metric)?.better === "higher" ? "≥" : "≤"}{findMetric(source, metric)?.unit === "ms" ? " ms" : ""})
          <Input aria-label="Budget threshold" className="h-9 w-28 font-mono" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </label>
        <Button type="submit" size="sm" className="h-9">Save budget</Button>
        {formError && <p role="alert" className="basis-full text-sm text-red-600 dark:text-red-400">{formError}</p>}
      </form>
    </div>
  );
}
