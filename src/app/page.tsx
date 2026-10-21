import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuditForm } from "@/components/audit-form";
import { RecentAudits } from "@/components/recent-audits";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header><h1 className="text-3xl font-bold">VeloAudit</h1><p className="text-muted-foreground">Web performance audits powered by Google PageSpeed Insights.</p></header>
      <Card><CardHeader><CardTitle>New audit</CardTitle><CardDescription>Public http(s) URLs only.</CardDescription></CardHeader><CardContent><AuditForm /></CardContent></Card>
      <Card><CardHeader><CardTitle>Recent audits</CardTitle></CardHeader><CardContent><RecentAudits /></CardContent></Card>
    </main>
  );
}
