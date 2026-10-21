export function fmtMs(v: number | null | undefined): string {
  if (v === null || v === undefined) return "Unavailable";
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
}
export function fmtCls(v: number | null | undefined): string {
  return v === null || v === undefined ? "Unavailable" : v.toFixed(3);
}
export function scoreColor(s: number | null): string {
  if (s === null) return "text-muted-foreground";
  return s >= 90 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-600";
}
