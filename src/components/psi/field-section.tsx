import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { assessCwv, categoryRating } from "@/lib/cwv";
import type { AuditView, Distribution, FieldKey, FieldValue } from "@/lib/types";
import { fmtCls, fmtMs } from "../format";
import { Indicator, RATING_TEXT } from "./rating";

const METRICS: { key: FieldKey; label: string; full: string; core: boolean }[] = [
  { key: "lcp", label: "LCP", full: "Largest Contentful Paint", core: true },
  { key: "inp", label: "INP", full: "Interaction to Next Paint", core: true },
  { key: "cls", label: "CLS", full: "Cumulative Layout Shift", core: true },
  { key: "fcp", label: "FCP", full: "First Contentful Paint", core: false },
  { key: "ttfb", label: "TTFB", full: "Time to First Byte", core: false },
];

function fieldValue(f: AuditView["field"], k: FieldKey): FieldValue {
  return k === "lcp" ? f.lcpMs : k === "inp" ? f.inpMs : k === "cls" ? f.cls : k === "fcp" ? f.fcpMs : f.ttfbMs;
}

/** Stacked good / NI / poor bar from the real CrUX histogram. Absent histogram renders nothing (never estimated). */
export function DistributionBar({ d, label }: { d: Distribution; label: string }) {
  const parts = [
    { p: d[0], cls: "bg-emerald-500", name: "Good" },
    { p: d[1], cls: "bg-amber-400", name: "Needs improvement" },
    { p: d[2], cls: "bg-rose-500", name: "Poor" },
  ];
  return (
    <div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${label} distribution: ${parts.map((x) => `${x.name} ${Math.round(x.p * 100)}%`).join(", ")}`}>
        {parts.map((x) => <div key={x.name} className={`${x.cls} h-full transition-[width] duration-700`} style={{ width: `${Math.max(x.p * 100, x.p > 0 ? 1.5 : 0)}%` }} />)}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums text-muted-foreground">
        {parts.map((x) => <span key={x.name}>{Math.round(x.p * 100)}%</span>)}
      </div>
    </div>
  );
}

function FieldCard({ audit, m }: { audit: AuditView; m: (typeof METRICS)[number] }) {
  const v = fieldValue(audit.field, m.key);
  const rating = categoryRating(v?.category);
  const text = v === null ? "Unavailable" : m.key === "cls" ? fmtCls(v.value) : fmtMs(v.value);
  const dist = audit.fieldDistributions[m.key];
  return (
    <div className="lift rounded-xl border border-border bg-subtle/50 p-4" data-testid={`field-${m.key}`}>
      <div className="flex items-center gap-2">
        <Indicator rating={rating} />
        <span className="text-[12px] font-medium tracking-tight" title={m.full}>{m.full} <span className="text-muted-foreground">({m.label})</span></span>
      </div>
      <div className={`mt-2.5 text-[26px] font-semibold tabular-nums tracking-tight ${v === null ? "text-[14px] font-normal italic text-muted-foreground" : RATING_TEXT[rating]}`}>{text}</div>
      <div className="mt-3">{dist ? <DistributionBar d={dist} label={m.label} /> : <p className="text-[11px] text-muted-foreground">{v ? "Distribution not reported" : "No real-user data"}</p>}</div>
    </div>
  );
}

export function FieldSection({ audit }: { audit: AuditView }) {
  const f = audit.field;
  const verdict = assessCwv(f);
  const banner = {
    passed: { icon: CheckCircle2, text: "Passed", cls: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300" },
    failed: { icon: XCircle, text: "Failed", cls: "border-rose-500/25 bg-rose-500/[0.07] text-rose-700 dark:text-rose-300" },
    no_data: { icon: CircleSlash, text: "No data", cls: "border-border bg-subtle text-muted-foreground" },
  }[verdict];
  const scope = f.scope === null ? "No Chrome UX Report field data is available for this URL or origin."
    : f.scope === "origin" ? "Origin-level data — this URL has too little traffic for URL-level data." : "URL-level real-user data, 28-day rolling p75.";
  return (
    <section className="space-y-4" aria-labelledby="field-h">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Field · Chrome UX Report</p>
          <h2 id="field-h" className="mt-1 text-lg font-semibold tracking-tight">Discover what your real users are experiencing</h2>
        </div>
      </div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 ${banner.cls}`} data-testid="cwv-assessment" data-verdict={verdict}>
        <banner.icon className="size-[18px]" />
        <span className="text-[14px] font-semibold tracking-tight">Core Web Vitals Assessment: {banner.text}</span>
        <span className="text-[12px] opacity-80">{scope}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{METRICS.filter((m) => m.core).map((m) => <FieldCard key={m.key} audit={audit} m={m} />)}</div>
      <p className="eyebrow pt-1">Other notable metrics</p>
      <div className="grid gap-3 sm:grid-cols-3">{METRICS.filter((m) => !m.core).map((m) => <FieldCard key={m.key} audit={audit} m={m} />)}</div>
    </section>
  );
}
