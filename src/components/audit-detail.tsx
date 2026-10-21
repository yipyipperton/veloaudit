"use client";
import Link from "next/link";
import { Download, FileText, LineChart, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { MetricTile } from "./metric-tile";
import { BudgetsPanel } from "./budgets-panel";
import { categoryColor, fmtCls, fmtMs, historyHref, scoreColor } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView, FieldValue } from "@/lib/types";

const fieldMs = (f: FieldValue) => fmtMs(f?.value ?? null);

export function AuditDetail({ id }: { id: string }) {
  const { data, error } = usePoll<{ audit: AuditView }>(`/api/audits/${id}`, 2000, (d) => d.audit.status === "QUEUED" || d.audit.status === "RUNNING");
  if (error && !data) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const a = data.audit;
  const pending = a.status === "QUEUED" || a.status === "RUNNING";
  const f = a.field;
  const report = (fmt: "html" | "md", dl: boolean) => `/api/audits/${a.id}/report?format=${fmt}${dl ? "&download=1" : ""}`;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 break-all font-mono text-base">{a.url} <Badge variant="outline">{a.strategy}</Badge> <StatusBadge status={a.status} /></CardTitle>
          <CardDescription className="tabular-nums">
            Created {new Date(a.createdAt).toLocaleString()}
            {a.completedAt && <> · Completed {new Date(a.completedAt).toLocaleString()}</>}
            {a.lighthouseVersion && <> · Lighthouse {a.lighthouseVersion}</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending && <p className="animate-pulse text-sm text-muted-foreground">Audit {a.status.toLowerCase()}… PageSpeed Insights runs typically take 15–60 seconds.</p>}
          {a.status === "FAILED" && <p role="alert" className="text-sm text-red-600 dark:text-red-400">Failed ({a.error?.code}): {a.error?.message}</p>}
          {a.status === "SUCCEEDED" && (
            <div className="flex items-baseline gap-3">
              <span className={`font-mono text-6xl font-bold tabular-nums ${scoreColor(a.lab.score)}`} data-testid="score">{a.lab.score ?? "—"}</span>
              <span className="text-muted-foreground">Lighthouse performance score (lab)</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={historyHref(a.url, a.strategy)}><LineChart className="size-4" /> History &amp; trends</Link>
            {a.status === "SUCCEEDED" && <>
              <a className={buttonVariants({ variant: "outline", size: "sm" })} href={report("html", false)} target="_blank" rel="noreferrer"><Printer className="size-4" /> Printable report</a>
              <a className={buttonVariants({ variant: "outline", size: "sm" })} href={report("html", true)} data-testid="dl-html"><Download className="size-4" /> HTML</a>
              <a className={buttonVariants({ variant: "outline", size: "sm" })} href={report("md", true)} data-testid="dl-md"><FileText className="size-4" /> Markdown</a>
            </>}
          </div>
        </CardContent>
      </Card>

      {a.status === "SUCCEEDED" && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Lab metrics <span className="font-normal text-muted-foreground">· Lighthouse</span></CardTitle>
                <CardDescription>Single simulated run. &ldquo;Server response&rdquo; is backend latency for the root document, not a full TTFB; real-user TTFB is in field data.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricTile testId="lab-lcp" label="LCP" value={fmtMs(a.lab.lcpMs)} />
                <MetricTile testId="lab-fcp" label="FCP" value={fmtMs(a.lab.fcpMs)} />
                <MetricTile testId="lab-si" label="Speed Index" value={fmtMs(a.lab.speedIndexMs)} />
                <MetricTile testId="lab-tbt" label="TBT" value={fmtMs(a.lab.tbtMs)} />
                <MetricTile testId="lab-cls" label="CLS" value={fmtCls(a.lab.cls)} />
                <MetricTile testId="lab-ttfb" label="Server response" value={fmtMs(a.lab.ttfbMs)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Field metrics <span className="font-normal text-muted-foreground">· CrUX p75</span></CardTitle>
                <CardDescription>
                  {f.scope === null ? "No Chrome UX Report field data is available for this URL or origin." :
                    f.scope === "origin" ? "Origin-level data (URL-level data not available)." : "URL-level real-user data (28-day rolling)."}
                  {f.overall && <> Overall: <span className={categoryColor(f.overall)}>{f.overall.toLowerCase()}</span>.</>}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricTile testId="field-lcp" label="LCP" value={fieldMs(f.lcpMs)} sub={f.lcpMs?.category} subClass={categoryColor(f.lcpMs?.category)} />
                <MetricTile testId="field-inp" label="INP" value={fieldMs(f.inpMs)} sub={f.inpMs?.category} subClass={categoryColor(f.inpMs?.category)} />
                <MetricTile testId="field-cls" label="CLS" value={fmtCls(f.cls?.value ?? null)} sub={f.cls?.category} subClass={categoryColor(f.cls?.category)} />
                <MetricTile testId="field-fcp" label="FCP" value={fieldMs(f.fcpMs)} sub={f.fcpMs?.category} subClass={categoryColor(f.fcpMs?.category)} />
                <MetricTile testId="field-ttfb" label="TTFB" value={fieldMs(f.ttfbMs)} sub={f.ttfbMs?.category} subClass={categoryColor(f.ttfbMs?.category)} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Performance budgets</CardTitle>
              <CardDescription>Each target is checked against its declared source only. Missing data is marked <em>not evaluable</em>, never pass.</CardDescription></CardHeader>
            <CardContent><BudgetsPanel url={a.url} strategy={a.strategy} auditId={a.id} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Opportunities</CardTitle><CardDescription>Failing Lighthouse audits with estimated savings, from this run.</CardDescription></CardHeader>
            <CardContent>
              {a.opportunities.length === 0 ? <p className="text-sm text-muted-foreground">Lighthouse reported no opportunities with savings for this run.</p> : (
                <ul className="divide-y divide-border/70" data-testid="opportunities">
                  {a.opportunities.map((o) => (
                    <li key={o.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{o.title}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {o.savingsMs ? `Est. savings ~${fmtMs(o.savingsMs)} ` : ""}{!o.savingsMs && o.metricSavings?.["CLS"] ? `CLS −${o.metricSavings["CLS"].toFixed(3)} ` : ""}{o.savingsBytes ? `· ${Math.round(o.savingsBytes / 1024)} KiB ` : ""}{o.displayValue ? `· ${o.displayValue}` : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
