import { describe, expect, it } from "vitest";
import { renderHtml, renderMarkdown } from "@/server/report/render";
import { evaluateBudgets } from "@/lib/budgets";
import { syntheticAudit } from "./helpers";

const a = syntheticAudit({
  url: "https://synthetic.invalid/?q=<script>",
  field: { scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null },
  opportunities: [{ id: "x", title: "Fix <img> | pipes", description: "Do the thing", score: 0, displayValue: null, savingsMs: 1200, savingsBytes: 2048 }],
});
const budgets = evaluateBudgets([{ source: "field", metric: "inp", threshold: 200 }, { source: "lab", metric: "lcp", threshold: 2500 }], a);

describe("report rendering (SYNTHETIC)", () => {
  it("markdown includes metrics, unavailable field values, budgets and fixes", () => {
    const md = renderMarkdown(a, budgets);
    expect(md).toContain("## Lab metrics (Lighthouse)");
    expect(md).toContain("| LCP | 2.00 s |");
    expect(md).toMatch(/INP \(p75\) \| Unavailable/);
    expect(md).toContain("NOT EVALUABLE");
    expect(md).toContain("PASS");
    expect(md).toContain("Fix <img> \\| pipes");
    expect(md).toContain("Fix: Do the thing");
  });
  it("html escapes user/third-party content and is printable", () => {
    const html = renderHtml(a, budgets);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Fix &lt;img&gt;");
    expect(html).toContain("@media print");
    expect(html).toContain("Unavailable");
  });
  it("failed audits render the error instead of metrics", () => {
    const md = renderMarkdown(syntheticAudit({ status: "FAILED", error: { code: "PSI_TIMEOUT", message: "timed out" } }));
    expect(md).toContain("PSI_TIMEOUT");
    expect(md).not.toContain("## Lab metrics");
  });
});
