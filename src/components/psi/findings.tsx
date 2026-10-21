import { ChevronDown } from "lucide-react";
import { scoreRating } from "@/lib/cwv";
import type { Opportunity } from "@/lib/types";
import { fmtMs } from "../format";
import { Indicator } from "./rating";

function savings(o: Opportunity): string | null {
  if (o.savingsMs) return `~${fmtMs(o.savingsMs)}`;
  if (o.metricSavings?.["CLS"]) return `CLS −${o.metricSavings["CLS"].toFixed(3)}`;
  return null;
}

/** Expandable PSI-style rows. Everything shown comes from the Lighthouse audit itself. */
export function FindingList({ items, testId, empty }: { items: Opportunity[]; testId: string; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border" data-testid={testId}>
      {items.map((o) => {
        const s = savings(o);
        return (
          <li key={o.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle [&::-webkit-details-marker]:hidden">
                <Indicator rating={scoreRating(o.score)} />
                <span className="min-w-0 flex-1 text-[13.5px] font-medium tracking-tight">{o.title}
                  {o.displayValue && <span className="ml-2 font-normal text-muted-foreground">— {o.displayValue}</span>}
                </span>
                {s && <span className="hidden rounded-md bg-subtle px-2 py-0.5 font-mono text-[11px] text-muted-foreground ring-1 ring-inset ring-border sm:inline">{s}</span>}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="space-y-3 px-4 pb-4 pl-[38px]">
                <p className="text-[13px] leading-relaxed text-muted-foreground">{o.description}</p>
                {o.table && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-subtle text-muted-foreground"><tr>{o.table.headings.map((h) => <th key={h} className="px-3 py-1.5 font-medium">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-border">
                        {o.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j === 0 ? "max-w-[420px] truncate font-mono text-[11px]" : "whitespace-nowrap tabular-nums"}`} title={c}>{c}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
