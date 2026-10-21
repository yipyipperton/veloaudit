"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { fmtCls, fmtMs, scoreColor } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView, FieldValue } from "./types";

function Metric({ label, value, sub, testId }: { label: string; value: string; sub?: string | null; testId: string }) {
  const unavailable = value === "Unavailable";
  return (
    <div className="rounded-lg border p-3" data-testid={testId}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${unavailable ? "text-muted-foreground italic" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub.toLowerCase().replace(/_/g, " ")}</div>}
    </div>
  );
}

const fieldMs = (f: FieldValue) => fmtMs(f?.value ?? null);

export function AuditDetail({ id }: { id: string }) {
  const { data, error } = usePoll<{ audit: AuditView }>(`/api/audits/${id}`, 2000, (d) => d.audit.status === "QUEUED" || d.audit.status === "RUNNING");
  if (error && !data) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const a = data.audit;
  const pending = a.status === "QUEUED" || a.status === "RUNNING";
  const f = a.field;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 break-all">{a.url} <Badge variant="outline">{a.strategy}</Badge> <StatusBadge status={a.status} /></CardTitle>
          <CardDescription>
            Created {new Date(a.createdAt).toLocaleString()}
            {a.completedAt && <> · Completed {new Date(a.completedAt).toLocaleString()}</>}
            {a.lighthouseVersion && <> · Lighthouse {a.lighthouseVersion}</>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending && <p className="animate-pulse text-sm text-muted-foreground">Audit {a.status.toLowerCase()}… PageSpeed Insights runs typically take 15–60 seconds.</p>}
          {a.status === "FAILED" && <p role="alert" className="text-sm text-red-600">Failed ({a.error?.code}): {a.error?.message}</p>}
          {a.status === "SUCCEEDED" && (
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold ${scoreColor(a.lab.score)}`} data-testid="score">{a.lab.score ?? "—"}</span>
              <span className="text-muted-foreground">Lighthouse performance score (lab)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {a.status === "SUCCEEDED" && (
        <>
          <Card>
            <CardHeader><CardTitle>Lab metrics (Lighthouse)</CardTitle><CardDescription>Simulated single run from PageSpeed Insights.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Metric testId="lab-lcp" label="LCP" value={fmtMs(a.lab.lcpMs)} />
              <Metric testId="lab-fcp" label="FCP" value={fmtMs(a.lab.fcpMs)} />
              <Metric testId="lab-si" label="Speed Index" value={fmtMs(a.lab.speedIndexMs)} />
              <Metric testId="lab-tbt" label="TBT" value={fmtMs(a.lab.tbtMs)} />
              <Metric testId="lab-cls" label="CLS" value={fmtCls(a.lab.cls)} />
              <Metric testId="lab-ttfb" label="TTFB (server response)" value={fmtMs(a.lab.ttfbMs)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Field metrics (CrUX, p75)</CardTitle>
              <CardDescription>
                {f.scope === null ? "No Chrome UX Report field data is available for this URL or origin." :
                  f.scope === "origin" ? "Origin-level data (URL-level data not available)." : "URL-level real-user data."}
                {f.overall && <> Overall: {f.overall.toLowerCase()}.</>}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Metric testId="field-lcp" label="LCP" value={fieldMs(f.lcpMs)} sub={f.lcpMs?.category} />
              <Metric testId="field-inp" label="INP" value={fieldMs(f.inpMs)} sub={f.inpMs?.category} />
              <Metric testId="field-cls" label="CLS" value={fmtCls(f.cls?.value ?? null)} sub={f.cls?.category} />
              <Metric testId="field-fcp" label="FCP" value={fieldMs(f.fcpMs)} sub={f.fcpMs?.category} />
              <Metric testId="field-ttfb" label="TTFB" value={fieldMs(f.ttfbMs)} sub={f.ttfbMs?.category} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Opportunities</CardTitle><CardDescription>Failing Lighthouse audits with estimated savings, from this run.</CardDescription></CardHeader>
            <CardContent>
              {a.opportunities.length === 0 ? <p className="text-sm text-muted-foreground">Lighthouse reported no opportunities with savings for this run.</p> : (
                <ul className="divide-y" data-testid="opportunities">
                  {a.opportunities.map((o) => (
                    <li key={o.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{o.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {o.savingsMs ? `~${fmtMs(o.savingsMs)} ` : ""}{o.savingsBytes ? `· ${Math.round(o.savingsBytes / 1024)} KiB ` : ""}{o.displayValue ? `· ${o.displayValue}` : ""}
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
