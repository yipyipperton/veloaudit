import { formatValue } from "@/lib/metrics";

export const fmtMs = (v: number | null | undefined): string => formatValue(v, "ms");
export const fmtCls = (v: number | null | undefined): string => formatValue(v, "unitless");
export function scoreColor(s: number | null): string {
  if (s === null) return "text-muted-foreground";
  return s >= 90 ? "text-emerald-600 dark:text-emerald-400" : s >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
}
export function categoryColor(c: string | null | undefined): string {
  if (c === "FAST") return "text-emerald-600 dark:text-emerald-400";
  if (c === "AVERAGE") return "text-amber-600 dark:text-amber-400";
  if (c === "SLOW") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}
export const historyHref = (url: string, strategy: string): string =>
  `/history?url=${encodeURIComponent(url)}&strategy=${encodeURIComponent(strategy)}`;
