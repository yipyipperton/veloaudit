"use client";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { scoreColor } from "./format";
import { usePoll } from "./use-poll";
import type { AuditView } from "./types";

export function RecentAudits() {
  const { data, error } = usePoll<{ audits: AuditView[] }>("/api/audits", 3000, () => true);
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.audits.length === 0) return <p className="text-sm text-muted-foreground">No audits yet.</p>;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Device</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
      <TableBody>
        {data.audits.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="max-w-xs truncate"><Link className="underline-offset-2 hover:underline" href={`/audits/${a.id}`}>{a.url}</Link></TableCell>
            <TableCell>{a.strategy}</TableCell>
            <TableCell><StatusBadge status={a.status} /></TableCell>
            <TableCell className={`text-right font-semibold ${scoreColor(a.lab.score)}`}>{a.lab.score ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
