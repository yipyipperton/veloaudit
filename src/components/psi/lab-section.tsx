/* eslint-disable @next/next/no-img-element -- stored Lighthouse screenshots served from our own API */
import { scoreRating } from "@/lib/cwv";
import type { AuditView } from "@/lib/types";
import { fmtCls, fmtMs } from "../format";
import { Indicator, RATING_FILL, RATING_TEXT } from "./rating";

export function BigGauge({ score }: { score: number | null }) {
  const rating = scoreRating(score, 100);
  const r = 54, c = 2 * Math.PI * r, pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const color = RATING_FILL[rating];
  return (
    <div className="relative grid size-40 place-items-center">
      <div className="absolute inset-4 rounded-full opacity-25 blur-2xl" style={{ background: color }} />
      <svg viewBox="0 0 120 120" className="relative -rotate-90" width="160" height="160" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill={`color-mix(in oklch, ${color} 10%, transparent)`} stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <span className="absolute text-[44px] font-semibold tabular-nums tracking-tight" style={{ color }} data-testid="score">{score ?? "—"}</span>
    </div>
  );
}

export function GaugeLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><Indicator rating="poor" className="size-2" />0–49</span>
      <span className="flex items-center gap-1.5"><Indicator rating="ni" className="size-2" />50–89</span>
      <span className="flex items-center gap-1.5"><Indicator rating="good" className="size-2" />90–100</span>
    </div>
  );
}

export function DeviceFrame({ audit }: { audit: AuditView }) {
  const shot = audit.screenshots.final;
  const img = shot
    ? <img src={shot.src} alt={`Final screenshot of ${audit.url} (${audit.strategy}) captured by Lighthouse`} className="block h-full w-full object-cover object-top" data-testid="final-screenshot" />
    : <div className="grid h-full w-full place-items-center bg-subtle p-4 text-center text-[11px] text-muted-foreground">No screenshot reported</div>;
  if (audit.strategy === "mobile")
    return (
      <div className="relative mx-auto w-[168px] rounded-[30px] border border-border bg-gradient-to-b from-zinc-200 to-zinc-300 p-[7px] shadow-[var(--shadow-soft)] dark:from-zinc-700 dark:to-zinc-800">
        <div className="relative aspect-[9/17] overflow-hidden rounded-[24px] bg-black">
          {img}
          <div className="absolute left-1/2 top-1.5 h-[14px] w-14 -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-subtle px-3 py-2">
        <span className="size-2 rounded-full bg-rose-400/80" /><span className="size-2 rounded-full bg-amber-400/80" /><span className="size-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2 truncate rounded-md bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{audit.finalUrl ?? audit.url}</span>
      </div>
      <div className="aspect-[16/10] overflow-hidden">{img}</div>
    </div>
  );
}

const LAB = [
  { id: "lab-fcp", label: "First Contentful Paint", k: "fcp", v: (a: AuditView) => fmtMs(a.lab.fcpMs) },
  { id: "lab-lcp", label: "Largest Contentful Paint", k: "lcp", v: (a: AuditView) => fmtMs(a.lab.lcpMs) },
  { id: "lab-tbt", label: "Total Blocking Time", k: "tbt", v: (a: AuditView) => fmtMs(a.lab.tbtMs) },
  { id: "lab-cls", label: "Cumulative Layout Shift", k: "cls", v: (a: AuditView) => fmtCls(a.lab.cls) },
  { id: "lab-si", label: "Speed Index", k: "si", v: (a: AuditView) => fmtMs(a.lab.speedIndexMs) },
] as const;

export function LabGrid({ audit }: { audit: AuditView }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-2">
      {LAB.map((m) => {
        const rating = scoreRating(audit.labMetricScores[m.k]);
        const value = m.v(audit);
        return (
          <div key={m.id} className="border-b border-border px-4 py-3.5 sm:odd:border-r" data-testid={m.id}>
            <div className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight"><Indicator rating={rating} />{m.label}</div>
            <div className={`mt-1 pl-[18px] text-[24px] font-semibold tabular-nums tracking-tight ${value === "Unavailable" ? "text-[14px] font-normal italic text-muted-foreground" : RATING_TEXT[rating]}`}>{value}</div>
          </div>
        );
      })}
      <div className="border-b border-border px-4 py-3.5" data-testid="lab-ttfb">
        <div className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight text-muted-foreground"><Indicator rating="none" />Server response (backend only)</div>
        <div className="mt-1 pl-[18px] text-[24px] font-semibold tabular-nums tracking-tight">{fmtMs(audit.lab.ttfbMs)}</div>
      </div>
    </div>
  );
}

export function Filmstrip({ audit }: { audit: AuditView }) {
  const t = audit.screenshots.thumbnails;
  if (t.length === 0) return null;
  return (
    <div data-testid="filmstrip">
      <p className="eyebrow mb-2">Filmstrip · screenshot-thumbnails</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {t.map((s, i) => (
          <figure key={s.src} className="shrink-0">
            <img src={s.src} alt={`Frame ${i + 1}${s.timingMs !== null ? ` at ${Math.round(s.timingMs)} ms` : ""}`} loading="lazy"
              className={`rounded-md border border-border bg-subtle object-cover object-top ${audit.strategy === "mobile" ? "h-28 w-[62px]" : "h-20 w-32"}`} />
            <figcaption className="mt-1 text-center font-mono text-[10px] tabular-nums text-muted-foreground">{s.timingMs !== null ? `${(s.timingMs / 1000).toFixed(1)} s` : "—"}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
