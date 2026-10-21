import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuditForm } from "@/components/audit-form";
import { RecentAudits } from "@/components/recent-audits";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Web performance audits</h1>
        <p className="max-w-2xl text-muted-foreground">Lighthouse lab metrics and Chrome UX Report field data from Google PageSpeed Insights, kept separate and stored for trends, comparisons and budgets.</p>
      </section>
      <Card><CardHeader><CardTitle>New audit</CardTitle><CardDescription>Public http(s) URLs only. Private, loopback and link-local targets are rejected.</CardDescription></CardHeader><CardContent><AuditForm /></CardContent></Card>
      <Card><CardHeader><CardTitle>Recent audits</CardTitle></CardHeader><CardContent><RecentAudits /></CardContent></Card>
    </main>
  );
}
