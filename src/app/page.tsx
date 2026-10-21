import { Activity, Gauge, GitCompare, Target } from "lucide-react";
import { AuditForm } from "@/components/audit-form";
import { RecentAudits } from "@/components/recent-audits";

const FEATURES = [
  { icon: Gauge, title: "Lab and field, never mixed", body: "Lighthouse lab runs and Chrome UX Report p75 are stored and shown separately. Missing data stays missing." },
  { icon: GitCompare, title: "Trends and comparisons", body: "Per-URL history charts and run-to-run deltas with a noise floor and honest variance caveats." },
  { icon: Target, title: "Performance budgets", body: "Targets bound to an explicit source. Unavailable metrics are not evaluable, never a silent pass." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-20 text-center sm:pt-28">
          <span className="fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Activity className="size-3.5 text-brand" /> PageSpeed Insights v5 · Lighthouse + CrUX
          </span>
          <h1 className="fade-up fade-up-1 text-gradient mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Know exactly how fast<br className="hidden sm:block" /> your site really is.
          </h1>
          <p className="fade-up fade-up-2 mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Run a real audit, track lab and field metrics over time, and catch regressions with budgets. No invented numbers.
          </p>
          <div className="fade-up fade-up-3 mt-10 w-full"><AuditForm /></div>
          <p className="mt-4 text-xs text-muted-foreground">Public http(s) URLs only · private, loopback and link-local targets are blocked</p>
        </div>
      </section>

      <section id="audits" className="mx-auto max-w-6xl scroll-mt-20 px-5 sm:px-6">
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Your recent audits</h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">Private to this browser · share a result by sending its link</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" /></span>Live</span>
          </div>
          <RecentAudits />
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-border bg-border mx-5 sm:mx-6 sm:grid-cols-3 xl:mx-auto">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-background p-6">
            <f.icon className="size-4 text-brand" />
            <h3 className="mt-4 text-[14px] font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
