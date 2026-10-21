"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendChart, type Point } from "./trend-chart";
import { BudgetsPanel } from "./budgets-panel";
import { fmtCls, fmtMs, scoreColor } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView } from "@/lib/types";

type Resp = { url: string; strategy: "mobile" | "desktop"; audits: AuditView[] };
// Fixed palette readable on both light and dark backgrounds.
const C = { a: "#8b5cf6", b: "#0ea5e9", c: "#10b981", d: "#f59e0b", e: "#f43f5e" };

function toPoints(audits: AuditView[]): Point[] {
  return audits.map((a, i) => ({
    t: `#${i + 1} ${new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${new Date(a.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`,
    labScore: a.lab.score, labLcp: a.lab.lcpMs, labFcp: a.lab.fcpMs, labSi: a.lab.speedIndexMs, labTbt: a.lab.tbtMs, labCls: a.lab.cls,
    fieldLcp: a.field.lcpMs?.value ?? null, fieldInp: a.field.inpMs?.value ?? null, fieldFcp: a.field.fcpMs?.value ?? null,
    fieldTtfb: a.field.ttfbMs?.value ?? null, fieldCls: a.field.cls?.value ?? null,
  }));
}

export function HistoryView({ url, strategy }: { url: string; strategy: "mobile" | "desktop" }) {
  const router = useRouter();
  const qs = new URLSearchParams({ url, strategy }).toString();
  const { data, error } = usePoll<Resp>(`/api/history?${qs}`, 0, () => false);
  const [sel, setSel] = useState<string[]>([]);
  if (error) return <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const pts = toPoints(data.audits);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));
  const anyField = data.audits.some((a) => a.field.scope !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="break-all font-mono text-lg font-semibold">{data.url}</h1>
        <Badge variant="outline">{data.strategy}</Badge>
        <span className="text-sm text-muted-foreground">{data.audits.length} completed audit{data.audits.length === 1 ? "" : "s"}</span>
        <div className="ml-auto flex gap-1">
          {(["mobile", "desktop"] as const).map((s) => (
            <Link key={s} className={buttonVariants({ size: "sm", variant: s === strategy ? "secondary" : "ghost" })} href={`/history?${new URLSearchParams({ url, strategy: s })}`}>{s}</Link>
          ))}
        </div>
      </div>
      {data.audits.length === 0 ? <p className="text-muted-foreground">No completed audits for this URL and strategy yet.</p> : (
        <>
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><span className="size-2 rounded-full bg-violet-500" />Lab · Lighthouse (single simulated run per audit)</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lab performance score</CardTitle></CardHeader>
                <CardContent><TrendChart testId="chart-lab-score" unit="score" data={pts} series={[{ key: "labScore", label: "Lab score", color: C.a }]} /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lab timings</CardTitle></CardHeader>
                <CardContent><TrendChart testId="chart-lab-timings" unit="ms" data={pts} series={[
                  { key: "labLcp", label: "Lab LCP", color: C.a }, { key: "labFcp", label: "Lab FCP", color: C.b },
                  { key: "labSi", label: "Lab Speed Index", color: C.c }, { key: "labTbt", label: "Lab TBT", color: C.d }]} /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lab CLS</CardTitle></CardHeader>
                <CardContent><TrendChart testId="chart-lab-cls" unit="unitless" data={pts} series={[{ key: "labCls", label: "Lab CLS", color: C.e }]} /></CardContent></Card>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><span className="size-2 rounded-full bg-sky-500" />Field · CrUX p75 (28-day rolling real-user data)</h2>
            {!anyField && <p className="text-sm text-muted-foreground">No field data was available for any of these audits; gaps are shown rather than estimated.</p>}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Field timings</CardTitle><CardDescription className="text-xs">Missing values appear as gaps. INP is never derived from lab TBT.</CardDescription></CardHeader>
                <CardContent><TrendChart testId="chart-field-timings" unit="ms" data={pts} series={[
                  { key: "fieldLcp", label: "Field LCP", color: C.a }, { key: "fieldInp", label: "Field INP", color: C.b },
                  { key: "fieldFcp", label: "Field FCP", color: C.c }, { key: "fieldTtfb", label: "Field TTFB", color: C.d }]} /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Field CLS</CardTitle></CardHeader>
                <CardContent><TrendChart testId="chart-field-cls" unit="unitless" data={pts} series={[{ key: "fieldCls", label: "Field CLS", color: C.e }]} /></CardContent></Card>
            </div>
          </section>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div><CardTitle>Runs</CardTitle><CardDescription>Select two runs to compare.</CardDescription></div>
              <Button size="sm" disabled={sel.length !== 2} data-testid="compare-btn" onClick={() => router.push(`/compare?a=${sel[0]}&b=${sel[1]}`)}>Compare selected ({sel.length}/2)</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead className="w-8" /><TableHead>#</TableHead><TableHead>When</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="text-right">Lab LCP</TableHead><TableHead className="text-right">Lab TBT</TableHead><TableHead className="text-right">Lab CLS</TableHead><TableHead className="text-right">Field LCP</TableHead><TableHead className="text-right">Field INP</TableHead><TableHead className="text-right">Field CLS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...data.audits].reverse().map((a) => {
                    const n = data.audits.indexOf(a) + 1;
                    return (
                      <TableRow key={a.id} data-state={sel.includes(a.id) ? "selected" : undefined}>
                        <TableCell><input type="checkbox" aria-label={`Select run ${n}`} checked={sel.includes(a.id)} onChange={() => toggle(a.id)} className="size-4 accent-violet-600" /></TableCell>
                        <TableCell className="font-mono text-xs"><Link className="hover:underline" href={`/audits/${a.id}`}>#{n}</Link></TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{new Date(a.createdAt).toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${scoreColor(a.lab.score)}`}>{a.lab.score ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtMs(a.lab.lcpMs)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtMs(a.lab.tbtMs)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtCls(a.lab.cls)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtMs(a.field.lcpMs?.value)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtMs(a.field.inpMs?.value)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtCls(a.field.cls?.value)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <Card>
        <CardHeader><CardTitle>Performance budgets</CardTitle><CardDescription>Evaluated against the latest completed audit, using each budget&apos;s declared source.</CardDescription></CardHeader>
        <CardContent><BudgetsPanel url={url} strategy={strategy} /></CardContent>
      </Card>
    </div>
  );
}
