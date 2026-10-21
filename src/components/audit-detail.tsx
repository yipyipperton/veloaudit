"use client";
import Link from "next/link";
import { Download, FileText, LineChart, Monitor, Printer, Smartphone } from "lucide-react";
import { ScoreGauge } from "./score-gauge";
import { Skeleton, SkeletonDetail } from "./skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { MetricTile } from "./metric-tile";
import { BudgetsPanel } from "./budgets-panel";
import { categoryColor, fmtCls, fmtMs, historyHref } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView, FieldValue } from "@/lib/types";

const btn = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium shadow-xs transition-all hover:bg-subtle active:scale-[0.98]";
const fieldMs = (f: FieldValue) => fmtMs(f?.value ?? null);

export function AuditDetail({ id }: { id: string }) {
  const { data, error } = usePoll<{ audit: AuditView }>(`/api/audits/${id}`, 2000, (d) => d.audit.status === "QUEUED" || d.audit.status === "RUNNING");
  if (error && !data) return <p className="text-rose-600">{error}</p>;
  if (!data) return <SkeletonDetail />;
  const a = data.audit;
  const pending = a.status === "QUEUED" || a.status === "RUNNING";
  const f = a.field;
  const report = (fmt: "html" | "md", dl: boolean) => `/api/audits/${a.id}/report?format=${fmt}${dl ? "&download=1" : ""}`;
  return (
    <div className="space-y-6">
      <section className="surface fade-up relative overflow-hidden p-5 sm:p-7">
        <div className="hero-glow pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {a.status === "SUCCEEDED" ? <ScoreGauge score={a.lab.score} /> : pending ? <Skeleton className="size-28 shrink-0 rounded-full" /> : null}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{a.status === "SUCCEEDED" ? "Performance score · lab" : "Audit"}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{a.strategy === "mobile" ? <Smartphone className="size-3" /> : <Monitor className="size-3" />}{a.strategy}</span>
              <StatusBadge status={a.status} />
            </div>
            <h1 className="break-all text-xl font-semibold tracking-tight sm:text-2xl">{a.url}</h1>
            <p className="text-xs tabular-nums text-muted-foreground">
              Created {new Date(a.createdAt).toLocaleString()}
              {a.completedAt && <> · Completed {new Date(a.completedAt).toLocaleString()}</>}
              {a.lighthouseVersion && <> · Lighthouse {a.lighthouseVersion}</>}
            </p>
          </div>
        </div>
        {pending && (
          <div className="relative mt-6">
            <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="brand-gradient h-full w-1/3 animate-[indeterminate_1.4s_ease-in-out_infinite] rounded-full" /></div>
            <p className="mt-3 text-sm text-muted-foreground">Audit {a.status.toLowerCase()}… PageSpeed Insights runs typically take 15–60 seconds.</p>
          </div>
        )}
        {a.status === "FAILED" && <p role="alert" className="relative mt-5 rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">Failed ({a.error?.code}): {a.error?.message}</p>}
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Link className={btn} href={historyHref(a.url, a.strategy)}><LineChart className="size-3.5" /> History &amp; trends</Link>
          {a.status === "SUCCEEDED" && <>
            <a className={btn} href={report("html", false)} target="_blank" rel="noreferrer"><Printer className="size-3.5" /> Printable report</a>
            <a className={btn} href={report("html", true)} data-testid="dl-html"><Download className="size-3.5" /> HTML</a>
            <a className={btn} href={report("md", true)} data-testid="dl-md"><FileText className="size-3.5" /> Markdown</a>
          </>}
        </div>
      </section>

      {pending && <SkeletonDetail />}

      {a.status === "SUCCEEDED" && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Lab metrics <span className="font-normal text-muted-foreground">· Lighthouse</span></CardTitle>
                <CardDescription>Single simulated run. &ldquo;Server response&rdquo; is backend latency for the root document, not a full TTFB; real-user TTFB is in field data.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
              <CardContent className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
                    <li key={o.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[14px] font-medium tracking-tight">{o.title}</span>
                        <span className="rounded-md bg-subtle px-2 py-0.5 font-mono text-[11px] text-muted-foreground ring-1 ring-inset ring-border">
                          {o.savingsMs ? `Est. savings ~${fmtMs(o.savingsMs)} ` : ""}{!o.savingsMs && o.metricSavings?.["CLS"] ? `CLS −${o.metricSavings["CLS"].toFixed(3)} ` : ""}{o.savingsBytes ? `· ${Math.round(o.savingsBytes / 1024)} KiB ` : ""}{o.displayValue ? `· ${o.displayValue}` : ""}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{o.description}</p>
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
