"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatValue, type MetricUnit } from "@/lib/metrics";

export type Series = { key: string; label: string; color: string };
export type Point = { t: string } & Record<string, number | null | string>;

export function TrendChart({ data, series, unit, testId }: { data: Point[]; series: Series[]; unit: MetricUnit; testId: string }) {
  const tick = (v: number) => (unit === "ms" ? (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}`) : unit === "unitless" ? v.toFixed(2) : `${v}`);
  return (
    <div className="h-56 w-full" data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
          <YAxis tickFormatter={tick} width={48} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)"
            domain={unit === "score" ? [0, 100] : [0, "auto"]} />
          <Tooltip
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }}
            formatter={(v) => (typeof v === "number" ? formatValue(v, unit) : "Unavailable")} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
