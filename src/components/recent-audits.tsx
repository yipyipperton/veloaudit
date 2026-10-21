"use client";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { historyHref, scoreColor } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView } from "@/lib/types";

export function RecentAudits() {
  const { data, error } = usePoll<{ audits: AuditView[] }>("/api/audits", 3000, () => true);
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.audits.length === 0) return <p className="text-sm text-muted-foreground">No audits yet. Run one above.</p>;
  return (
    <Table data-testid="recent-audits">
      <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Device</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader>
      <TableBody>
        {data.audits.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="max-w-xs truncate font-mono text-xs"><Link className="hover:underline" href={`/audits/${a.id}`}>{a.url}</Link></TableCell>
            <TableCell className="text-muted-foreground">{a.strategy}</TableCell>
            <TableCell><StatusBadge status={a.status} /></TableCell>
            <TableCell className={`text-right font-mono font-semibold tabular-nums ${scoreColor(a.lab.score)}`}>{a.lab.score ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground tabular-nums">{new Date(a.createdAt).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <Link href={historyHref(a.url, a.strategy)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-label={`History for ${a.url} ${a.strategy}`}>
                <LineChart className="size-3.5" /> History
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
