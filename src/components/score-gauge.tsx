/** Circular score gauge (0-100). Renders an empty track when the score is unavailable. */
export function ScoreGauge({ score, size = 112 }: { score: number | null; size?: number }) {
  const r = 44, c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const tone = score === null ? "var(--muted-foreground)" : score >= 90 ? "oklch(0.7 0.16 155)" : score >= 50 ? "oklch(0.78 0.15 75)" : "oklch(0.65 0.21 25)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)", filter: `drop-shadow(0 0 6px color-mix(in oklch, ${tone} 45%, transparent))` }} />
      </svg>
      <span className="absolute text-[34px] font-semibold tabular-nums tracking-tight" style={{ color: tone }} data-testid="score">{score ?? "—"}</span>
    </div>
  );
}

export function ScorePill({ score }: { score: number | null }) {
  const cls = score === null ? "bg-muted text-muted-foreground"
    : score >= 90 ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300"
    : score >= 50 ? "bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300"
    : "bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-300";
  return <span className={`inline-flex min-w-9 justify-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums ring-1 ring-inset ${cls}`}>{score ?? "—"}</span>;
}
