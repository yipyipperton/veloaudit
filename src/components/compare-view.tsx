"use client";
import { Skeleton } from "./skeleton";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDelta, formatValue } from "@/lib/metrics";
import type { MetricDelta, Verdict } from "@/lib/compare";
import type { AuditView } from "@/lib/types";
import { historyHref } from "./format";
import { usePoll } from "./use-poll";

type Resp = { before: AuditView; after: AuditView; deltas: MetricDelta[]; caveat: string };
const V: Record<Verdict, string> = {
  improved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  regressed: "bg-red-500/15 text-red-700 dark:text-red-300",
  unchanged: "bg-muted text-muted-foreground",
  not_comparable: "bg-muted text-muted-foreground italic",
};

function DeltaTable({ rows, testId }: { rows: MetricDelta[]; testId: string }) {
  return (
    <Table data-testid={testId}>
      <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Before</TableHead><TableHead className="text-right">After</TableHead><TableHead className="text-right">Δ</TableHead><TableHead className="text-right">Δ %</TableHead><TableHead /></TableRow></TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={`${d.def.source}-${d.def.key}`} data-testid={`delta-${d.def.source}-${d.def.key}`}>
            <TableCell className="font-medium">{d.def.label}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatValue(d.before, d.def.unit)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatValue(d.after, d.def.unit)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{d.delta === null ? "—" : formatDelta(d.delta, d.def.unit)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{d.pct === null ? "—" : `${d.pct > 0 ? "+" : ""}${d.pct.toFixed(1)}%`}</TableCell>
            <TableCell className="text-right"><Badge variant="outline" className={`rounded-full border-transparent text-[11px] ${V[d.verdict]}`}>{d.verdict === "unchanged" ? "within noise" : d.verdict.replace("_", " ")}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompareView({ a, b }: { a: string; b: string }) {
  const { data, error } = usePoll<Resp>(`/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`, 0, () => false);
  if (error) return <p role="alert" className="text-rose-600 dark:text-rose-400">{error}</p>;
  if (!data) return <div className="space-y-6"><Skeleton className="h-8 w-80 max-w-full" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  const when = (x: AuditView) => new Date(x.createdAt).toLocaleString();
  return (
    <div className="space-y-6">
      <div className="fade-up flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="eyebrow basis-full">Compare runs</span>
        <h1 className="break-all text-2xl font-semibold tracking-tight">{data.before.url}</h1>
        <Badge variant="outline">{data.before.strategy}</Badge>
        <Link className="ml-auto text-sm text-muted-foreground hover:underline" href={historyHref(data.before.url, data.before.strategy)}>View history →</Link>
      </div>
      <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-[13px] leading-relaxed" role="note" data-testid="caveat">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p><strong>Run-to-run variance:</strong> {data.caveat}</p>
      </div>
      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <div>Before: <Link className="font-mono hover:underline" href={`/audits/${data.before.id}`}>{when(data.before)}</Link></div>
        <div>After: <Link className="font-mono hover:underline" href={`/audits/${data.after.id}`}>{when(data.after)}</Link></div>
      </div>
      <Card><CardHeader><CardTitle>Lab · Lighthouse</CardTitle><CardDescription>Single simulated runs. Deltas under max(10 ms, 5%), 2 score points or 0.01 CLS are shown as &ldquo;within noise&rdquo;.</CardDescription></CardHeader>
        <CardContent><DeltaTable testId="delta-lab" rows={data.deltas.filter((d) => d.def.source === "lab")} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Field · CrUX p75</CardTitle><CardDescription>28-day rolling aggregate; unavailable values are not compared.</CardDescription></CardHeader>
        <CardContent><DeltaTable testId="delta-field" rows={data.deltas.filter((d) => d.def.source === "field")} /></CardContent></Card>
    </div>
  );
}
