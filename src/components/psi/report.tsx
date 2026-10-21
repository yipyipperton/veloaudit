import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditView } from "@/lib/types";
import { BudgetsPanel } from "../budgets-panel";
import { FieldSection } from "./field-section";
import { BigGauge, DeviceFrame, Filmstrip, GaugeLegend, LabGrid } from "./lab-section";
import { FindingList } from "./findings";

/** PSI-inspired report for ONE device audit. Field and lab data are separate sections and never mixed. */
export function PsiReport({ audit: a }: { audit: AuditView }) {
  return (
    <div className="space-y-10" data-testid={`report-${a.strategy}`}>
      <FieldSection audit={a} />

      <section className="space-y-4" aria-labelledby="lab-h">
        <div>
          <p className="eyebrow">Lab · Lighthouse {a.lighthouseVersion ?? ""}</p>
          <h2 id="lab-h" className="mt-1 text-lg font-semibold tracking-tight">Diagnose performance issues</h2>
        </div>
        <div className="surface grid gap-8 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <BigGauge score={a.lab.score} />
            <div className="text-[15px] font-semibold tracking-tight">Performance</div>
            <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">Values are estimated from a single simulated Lighthouse run and may vary. The score is calculated directly from these lab metrics.</p>
            <GaugeLegend />
          </div>
          <DeviceFrame audit={a} />
        </div>
        <div className="flex items-center justify-between pt-2">
          <p className="eyebrow">Metrics</p>
        </div>
        <LabGrid audit={a} />
        <p className="text-[11.5px] text-muted-foreground">&ldquo;Server response&rdquo; is backend latency for the root document, not a full TTFB; real-user TTFB is in the field section above.</p>
        <Filmstrip audit={a} />
      </section>

      <section className="space-y-3" aria-labelledby="opp-h">
        <h2 id="opp-h" className="text-[15px] font-semibold tracking-tight">Opportunities &amp; insights <span className="font-normal text-muted-foreground">· {a.opportunities.length}</span></h2>
        <FindingList items={a.opportunities} testId="opportunities" empty="Lighthouse reported no opportunities with estimated savings for this run." />
      </section>
      <section className="space-y-3" aria-labelledby="diag-h">
        <h2 id="diag-h" className="text-[15px] font-semibold tracking-tight">Diagnostics <span className="font-normal text-muted-foreground">· {a.diagnostics.length}</span></h2>
        <p className="text-[12px] text-muted-foreground">Failing audits without an estimated metric saving. They don&apos;t directly affect the score.</p>
        <FindingList items={a.diagnostics} testId="diagnostics" empty="No failing diagnostics were reported for this run." />
      </section>

      <Card>
        <CardHeader><CardTitle>Performance budgets</CardTitle>
          <CardDescription>Each target is checked against its declared source only. Missing data is marked <em>not evaluable</em>, never pass.</CardDescription></CardHeader>
        <CardContent><BudgetsPanel url={a.url} strategy={a.strategy} auditId={a.id} /></CardContent>
      </Card>
    </div>
  );
}
