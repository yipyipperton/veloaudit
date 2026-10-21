"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, Link2, LineChart, Monitor, Printer, Smartphone } from "lucide-react";
import type { AuditView, RunView } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { ScorePill } from "./score-gauge";
import { Skeleton, SkeletonDetail } from "./skeleton";
import { historyHref } from "./format";
import { usePoll } from "./use-poll";
import { PsiReport } from "./psi/report";

const btn = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium shadow-xs transition-all hover:bg-subtle active:scale-[0.98]";
const isPending = (a: AuditView) => a.status === "QUEUED" || a.status === "RUNNING";
const DeviceIcon = ({ s, className = "size-3.5" }: { s: AuditView["strategy"]; className?: string }) =>
  s === "mobile" ? <Smartphone className={className} /> : <Monitor className={className} />;

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Live per-device progress. PSI exposes no percentage, so we show real state + elapsed time, not a fake percent. */
function DeviceProgress({ a, now, onSelect, selected }: { a: AuditView; now: number; onSelect: () => void; selected: boolean }) {
  const start = new Date(a.startedAt ?? a.createdAt).getTime();
  const end = a.completedAt ? new Date(a.completedAt).getTime() : now;
  const secs = Math.max(0, Math.round((end - start) / 1000));
  return (
    <button type="button" onClick={onSelect} data-testid={`progress-${a.strategy}`}
      className={`lift relative flex-1 overflow-hidden rounded-xl border bg-surface p-3.5 text-left transition-colors ${selected ? "border-[var(--brand)]/50 ring-1 ring-[var(--brand)]/30" : "border-border"}`}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg border border-border bg-subtle text-muted-foreground"><DeviceIcon s={a.strategy} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium capitalize tracking-tight">{a.strategy}</div>
          <div className="font-mono text-[11px] tabular-nums text-muted-foreground" suppressHydrationWarning>
            {a.status === "QUEUED" ? "waiting for worker…" : a.status === "RUNNING" ? `running · ${secs}s` : `${secs}s`}
          </div>
        </div>
        <div className="flex items-center gap-2"><span className="hidden sm:inline-flex"><StatusBadge status={a.status} /></span>{a.status === "SUCCEEDED" && <ScorePill score={a.lab.score} />}{a.status !== "SUCCEEDED" && <span className="sm:hidden"><StatusBadge status={a.status} /></span>}</div>
      </div>
      {isPending(a) && <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-muted"><div className="brand-gradient h-full w-1/3 animate-[indeterminate_1.4s_ease-in-out_infinite]" /></div>}
    </button>
  );
}

export function ResultsShell({ url, createdAt, audits, initialTab, shared = false }: { url: string; createdAt: string; audits: AuditView[]; initialTab?: string; shared?: boolean }) {
  const [tab, setTab] = useState<AuditView["strategy"]>(() => (audits.find((a) => a.strategy === initialTab) ?? audits[0])!.strategy);
  const now = useNow(audits.some(isPending));
  const active = audits.find((a) => a.strategy === tab) ?? audits[0]!;
  const select = (s: AuditView["strategy"]) => {
    setTab(s);
    const u = new URL(window.location.href); u.searchParams.set("tab", s); window.history.replaceState(null, "", u);
  };
  const report = (fmt: "html" | "md", dl: boolean) => `/api/audits/${active.id}/report?format=${fmt}${dl ? "&download=1" : ""}`;
  return (
    <div className="space-y-6">
      {shared && (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-subtle px-4 py-2.5 text-[12.5px] text-muted-foreground" data-testid="shared-notice">
          <Link2 className="mt-0.5 size-3.5 shrink-0" />
          You&apos;re viewing a shared link. This audit belongs to another browser session, so it won&apos;t appear in your recent audits or history.
        </p>
      )}
      <section className="surface fade-up relative overflow-hidden p-5 sm:p-7">
        <div className="hero-glow pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative space-y-2">
          <p className="eyebrow">PageSpeed report{audits.length > 1 ? " · mobile + desktop" : ""}</p>
          <h1 className="break-all text-xl font-semibold tracking-tight sm:text-2xl">{url}</h1>
          <p className="text-xs tabular-nums text-muted-foreground" suppressHydrationWarning>
            Requested {new Date(createdAt).toLocaleString()}{active.lighthouseVersion && <> · Lighthouse {active.lighthouseVersion}</>}
          </p>
        </div>
        <div className="relative mt-5 flex flex-col gap-2.5 sm:flex-row">
          {audits.map((a) => <DeviceProgress key={a.id} a={a} now={now} selected={a.strategy === tab} onSelect={() => select(a.strategy)} />)}
        </div>
      </section>

      <div className="sticky top-14 z-20 -mx-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/75 px-5 py-2.5 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border sm:px-2">
        <div role="tablist" aria-label="Device" className="flex rounded-lg bg-muted p-0.5">
          {audits.map((a) => (
            <button key={a.id} role="tab" type="button" aria-selected={a.strategy === tab} aria-controls="report-panel" onClick={() => select(a.strategy)}
              className={`flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-medium capitalize transition-all ${a.strategy === tab ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
              <DeviceIcon s={a.strategy} />{a.strategy}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link className={btn} href={historyHref(active.url, active.strategy)}><LineChart className="size-3.5" /> <span className="hidden sm:inline">History</span></Link>
          {active.status === "SUCCEEDED" && <>
            <a className={btn} href={report("html", false)} target="_blank" rel="noreferrer"><Printer className="size-3.5" /> <span className="hidden sm:inline">Report</span></a>
            <a className={btn} href={report("html", true)} data-testid="dl-html"><Download className="size-3.5" /> HTML</a>
            <a className={btn} href={report("md", true)} data-testid="dl-md"><FileText className="size-3.5" /> MD</a>
          </>}
        </div>
      </div>

      <div id="report-panel" role="tabpanel" key={active.id} className="fade-up">
        {active.status === "SUCCEEDED" && <PsiReport audit={active} />}
        {isPending(active) && <div className="space-y-3"><p className="text-sm text-muted-foreground">The {active.strategy} audit is {active.status.toLowerCase()}. PageSpeed Insights runs typically take 15–60 seconds.</p><SkeletonDetail /></div>}
        {active.status === "FAILED" && <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">The {active.strategy} audit failed ({active.error?.code}): {active.error?.message}</p>}
      </div>
    </div>
  );
}

function Loading() {
  return <div className="space-y-6"><Skeleton className="h-44 rounded-2xl" /><SkeletonDetail /></div>;
}

export function RunResults({ id, initialTab }: { id: string; initialTab?: string }) {
  const { data, error } = usePoll<{ run: RunView; viewerIsOwner: boolean }>(`/api/runs/${id}`, 2000, (d) => d.run.audits.some(isPending));
  if (error && !data) return <p role="alert" className="text-rose-600 dark:text-rose-400">{error}</p>;
  if (!data) return <Loading />;
  return <ResultsShell url={data.run.url} createdAt={data.run.createdAt} audits={data.run.audits} initialTab={initialTab} shared={!data.viewerIsOwner} />;
}

/** Legacy single audit (created before runs existed, or opened directly). */
export function AuditResults({ id }: { id: string }) {
  const { data, error } = usePoll<{ audit: AuditView; viewerIsOwner: boolean }>(`/api/audits/${id}`, 2000, (d) => isPending(d.audit));
  if (error && !data) return <p role="alert" className="text-rose-600 dark:text-rose-400">{error}</p>;
  if (!data) return <Loading />;
  return <ResultsShell url={data.audit.url} createdAt={data.audit.createdAt} audits={[data.audit]} shared={!data.viewerIsOwner} />;
}
