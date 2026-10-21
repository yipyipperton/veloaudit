const TONE: Record<string, string> = { FAST: "bg-emerald-500", AVERAGE: "bg-amber-500", SLOW: "bg-rose-500" };

export function MetricTile({ label, value, sub, subClass, testId }: { label: string; value: string; sub?: string | null; subClass?: string; testId: string }) {
  const unavailable = value === "Unavailable";
  return (
    <div className="lift rounded-xl border border-border bg-subtle/60 p-3.5" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        {sub && <span className={`size-1.5 rounded-full ${TONE[sub] ?? "bg-muted-foreground/40"}`} aria-hidden />}
      </div>
      <div className={`mt-2 text-[22px] font-semibold tabular-nums tracking-tight ${unavailable ? "text-[13px] font-normal italic text-muted-foreground" : ""}`}>{value}</div>
      {sub && <div className={`mt-0.5 text-[11px] ${subClass ?? "text-muted-foreground"}`}>{sub.toLowerCase().replace(/_/g, " ")}</div>}
    </div>
  );
}
