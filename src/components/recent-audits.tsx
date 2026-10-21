"use client";
import Link from "next/link";
import { ChevronRight, LineChart, Monitor, Smartphone } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { ScorePill } from "./score-gauge";
import { SkeletonRows } from "./skeleton";
import { historyHref } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView } from "@/lib/types";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentAudits() {
  const { data, error } = usePoll<{ audits: AuditView[] }>("/api/audits", 3000, () => true);
  if (error) return <p className="p-6 text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  if (!data) return <div className="p-6"><SkeletonRows /></div>;
  if (data.audits.length === 0)
    return <div className="px-6 py-14 text-center text-sm text-muted-foreground">No audits yet in this browser. Paste a URL above to run your first one.</div>;
  return (
    <ul className="divide-y divide-border" data-testid="recent-audits">
      {data.audits.map((a, i) => (
        <li key={a.id} className="fade-up group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle sm:gap-4 sm:px-6" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-subtle text-muted-foreground">
            {a.strategy === "mobile" ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/audits/${a.id}`} className="block truncate text-[14px] font-medium tracking-tight after:absolute after:inset-0">{a.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</Link>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground"><span className="capitalize">{a.strategy}</span><span>·</span><span suppressHydrationWarning>{ago(a.createdAt)}</span></div>
          </div>
          <div className="hidden sm:block"><StatusBadge status={a.status} /></div>
          <ScorePill score={a.lab.score} />
          <Link href={historyHref(a.url, a.strategy)} className="relative z-10 hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex" aria-label={`History for ${a.url} ${a.strategy}`}>
            <LineChart className="size-3.5" /> History
          </Link>
          <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
        </li>
      ))}
    </ul>
  );
}
