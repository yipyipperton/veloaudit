"use client";
import { ChevronDown } from "lucide-react";
import { scoreRating } from "@/lib/cwv";
import type { AuditView, CategoryId, CategoryView } from "@/lib/types";
import { FindingList } from "./findings";
import { RATING_FILL } from "./rating";
import { InlineCode } from "./inline-code";

const ORDER: { id: CategoryId; title: string; key: keyof AuditView["categoryScores"] }[] = [
  { id: "performance", title: "Performance", key: "performance" },
  { id: "accessibility", title: "Accessibility", key: "accessibility" },
  { id: "best-practices", title: "Best Practices", key: "bestPractices" },
  { id: "seo", title: "SEO", key: "seo" },
];
export const categorySectionId = (id: CategoryId) => `cat-${id}`;

export function MiniGauge({ score, size = 76 }: { score: number | null; size?: number }) {
  const color = RATING_FILL[scoreRating(score, 100)];
  const r = 42, c = 2 * Math.PI * r, pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r={r} fill={`color-mix(in oklch, ${color} 9%, transparent)`} stroke="var(--border)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <span className="absolute text-[22px] font-semibold tabular-nums tracking-tight" style={{ color }}>{score ?? "—"}</span>
    </span>
  );
}

/** Four PSI-style category gauges; each scrolls to its section. */
export function CategoryGauges({ audit }: { audit: AuditView }) {
  const jump = (id: CategoryId) => (e: React.MouseEvent) => {
    const el = document.getElementById(categorySectionId(id));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${categorySectionId(id)}`);
  };
  return (
    <nav aria-label="Lighthouse categories" className="surface grid grid-cols-2 gap-y-4 p-5 sm:grid-cols-4 sm:p-6" data-testid="category-gauges">
      {ORDER.map((c) => {
        const score = audit.categoryScores[c.key];
        return (
          <a key={c.id} href={`#${categorySectionId(c.id)}`} onClick={jump(c.id)} data-testid={`gauge-${c.id}`}
            className="group flex flex-col items-center gap-2 rounded-xl py-1 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[var(--brand)]">
            <MiniGauge score={score} />
            <span className="text-[13px] font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-foreground">{c.title}</span>
          </a>
        );
      })}
    </nav>
  );
}

function Collapsed({ label, items, testId, withDescription = false }: { label: string; items: { id: string; title: string; description?: string }[]; testId: string; withDescription?: boolean }) {
  if (items.length === 0) return null;
  return (
    <details className="group rounded-xl border border-border" data-testid={testId}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-subtle [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{label} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{items.length}</span></span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="divide-y divide-border border-t border-border">
        {items.map((i) => (
          <li key={i.id} className="px-4 py-2 text-[12.5px]">
            <span><InlineCode text={i.title} /></span>
            {withDescription && i.description && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{i.description}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Failed audits grouped by PSI's category groups, then collapsed passed / manual / not-applicable lists. */
export function CategorySection({ cat }: { cat: CategoryView }) {
  const groups = new Map<string, CategoryView["failed"]>();
  for (const f of cat.failed) {
    const g = f.group ?? "Other";
    groups.set(g, [...(groups.get(g) ?? []), f]);
  }
  return (
    <section id={categorySectionId(cat.id)} className="scroll-mt-48 space-y-4 sm:scroll-mt-36" data-testid={`section-${cat.id}`} aria-labelledby={`h-${cat.id}`}>
      <div className="flex items-center gap-4">
        <MiniGauge score={cat.score} size={64} />
        <div>
          <p className="eyebrow">Lab · Lighthouse</p>
          <h2 id={`h-${cat.id}`} className="text-lg font-semibold tracking-tight">{cat.title}</h2>
        </div>
      </div>
      {cat.failed.length === 0
        ? <p className="text-sm text-muted-foreground">No failed audits in this category.</p>
        : [...groups.entries()].map(([g, items]) => (
          <div key={g} className="space-y-2">
            <p className="eyebrow">{g}</p>
            <FindingList items={items} testId={`failed-${cat.id}`} empty="" />
          </div>
        ))}
      <div className="grid gap-2">
        <Collapsed label="Additional items to manually check" items={cat.manual} testId={`manual-${cat.id}`} withDescription />
        <Collapsed label="Passed audits" items={cat.passed} testId={`passed-${cat.id}`} />
        <Collapsed label="Not applicable" items={cat.notApplicable} testId={`na-${cat.id}`} />
      </div>
    </section>
  );
}
