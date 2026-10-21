export function MetricTile({ label, value, sub, subClass, testId }: { label: string; value: string; sub?: string | null; subClass?: string; testId: string }) {
  const unavailable = value === "Unavailable";
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3" data-testid={testId}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold tabular-nums ${unavailable ? "text-sm font-normal italic text-muted-foreground" : ""}`}>{value}</div>
      {sub && <div className={`text-xs ${subClass ?? "text-muted-foreground"}`}>{sub.toLowerCase().replace(/_/g, " ")}</div>}
    </div>
  );
}
