import { assessCwv } from "@/lib/cwv";
import { FIELD_METRICS, LAB_METRICS, formatValue } from "@/lib/metrics";
import type { BudgetResult } from "@/lib/budgets";
import type { AuditView } from "@/lib/types";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const md = (s: string): string => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

const fieldScopeNote = (a: AuditView): string =>
  a.field.scope === null ? "No Chrome UX Report field data is available for this URL or origin; field metrics are shown as unavailable."
    : a.field.scope === "origin" ? "Field data is origin-level (URL-level data not available)." : "Field data is URL-level real-user data (28-day p75).";

const LAB_NOTE = "Lab metrics come from a single simulated Lighthouse run and vary between runs. \"Server response\" is Lighthouse's root-document backend latency, not a full TTFB.";

function savings(o: AuditView["opportunities"][number]): string {
  const parts: string[] = [];
  if (o.savingsMs) parts.push(`~${formatValue(o.savingsMs, "ms")}`);
  if (!o.savingsMs && o.metricSavings?.["CLS"]) parts.push(`CLS −${o.metricSavings["CLS"].toFixed(3)}`);
  if (o.savingsBytes) parts.push(`${Math.round(o.savingsBytes / 1024)} KiB`);
  return parts.join(", ") || "—";
}
const CWV_LABEL = { passed: "Passed", failed: "Failed", no_data: "No data (insufficient CrUX field data)" } as const;
const cwvLine = (a: AuditView) => `Core Web Vitals Assessment (field data): ${CWV_LABEL[assessCwv(a.field)]}`;
const budgetLabel = (r: BudgetResult) => (r.status === "not_evaluable" ? "NOT EVALUABLE" : r.status.toUpperCase());

export function renderMarkdown(a: AuditView, budgets: readonly BudgetResult[] = []): string {
  const L: string[] = [];
  L.push(`# VeloAudit report — ${a.url}`, "");
  L.push(`- Strategy: ${a.strategy}`, `- Audit ID: ${a.id}`, `- Status: ${a.status}`, `- Run at: ${a.fetchTime ?? a.completedAt ?? a.createdAt}`,
    `- Lighthouse: ${a.lighthouseVersion ?? "unknown"}`, "");
  if (a.status !== "SUCCEEDED") {
    L.push(`Audit did not complete: ${a.error?.code ?? a.status} ${a.error?.message ?? ""}`.trim());
    return L.join("\n") + "\n";
  }
  L.push(`## Performance score (lab): ${formatValue(a.lab.score, "score")}`, "", `> ${LAB_NOTE}`, "");
  if (a.categories.length) {
    L.push("## Lighthouse categories (lab)", "", "| Category | Score | Failed | Passed | Manual | Not applicable |", "| --- | --- | --- | --- | --- | --- |");
    for (const c of a.categories) L.push(`| ${md(c.title)} | ${formatValue(c.score, "score")} | ${c.failed.length} | ${c.passed.length} | ${c.manual.length} | ${c.notApplicable.length} |`);
    L.push("");
  }
  L.push("## Lab metrics (Lighthouse)", "", "| Metric | Value |", "| --- | --- |");
  for (const m of LAB_METRICS.filter((x) => x.unit !== "score")) L.push(`| ${m.label} | ${formatValue(m.get(a), m.unit)} |`);
  L.push("", "## Field metrics (CrUX, p75)", "", `**${cwvLine(a)}**`, "", `> ${fieldScopeNote(a)}`, "", "| Metric | Value | Category |", "| --- | --- | --- |");
  const cats = { lcp: a.field.lcpMs, inp: a.field.inpMs, cls: a.field.cls, fcp: a.field.fcpMs, ttfb: a.field.ttfbMs } as const;
  for (const m of FIELD_METRICS) L.push(`| ${m.label} | ${formatValue(m.get(a), m.unit)} | ${cats[m.key as keyof typeof cats]?.category?.toLowerCase() ?? "—"} |`);
  if (budgets.length) {
    L.push("", "## Budgets", "", "| Source | Metric | Target | Actual | Result |", "| --- | --- | --- | --- | --- |");
    for (const r of budgets) {
      const unit = LAB_METRICS.concat(FIELD_METRICS).find((m) => m.source === r.source && m.key === r.metric)?.unit ?? "ms";
      L.push(`| ${r.source} | ${md(r.label)} | ${r.comparator} ${formatValue(r.threshold, unit)} | ${formatValue(r.actual, unit)} | ${budgetLabel(r)} |`);
    }
  }
  L.push("", "## Issues and fixes (from Lighthouse audits)", "");
  if (!a.opportunities.length) L.push("Lighthouse reported no opportunities with savings for this run.");
  a.opportunities.forEach((o, i) => {
    L.push(`### ${i + 1}. ${md(o.title)}`, "", `- Estimated savings: ${savings(o)}${o.displayValue ? ` (${md(o.displayValue)})` : ""}`, `- Fix: ${md(o.description)}`, "");
  });
  for (const c of a.categories.filter((x) => x.id !== "performance")) {
    L.push("", `## ${md(c.title)} — failed audits (${c.failed.length})`, "");
    if (!c.failed.length) L.push("No failed audits.");
    for (const f of c.failed) L.push(`- **${md(f.title)}**${f.group ? ` _(${md(f.group)})_` : ""}${f.displayValue ? ` — ${md(f.displayValue)}` : ""}: ${md(f.description)}`);
    if (c.manual.length) L.push("", `Manual checks: ${c.manual.map((m) => md(m.title)).join("; ")}`);
  }
  if (a.diagnostics.length) {
    L.push("## Diagnostics (failing audits without estimated savings)", "");
    for (const o of a.diagnostics) L.push(`- **${md(o.title)}**${o.displayValue ? ` — ${md(o.displayValue)}` : ""}`);
  }
  L.push("", "_Generated by VeloAudit from Google PageSpeed Insights data. Metrics are reported as measured; unavailable values are not estimated._");
  return L.join("\n") + "\n";
}

export function renderHtml(a: AuditView, budgets: readonly BudgetResult[] = []): string {
  const row = (k: string, v: string, c = "") => `<tr><td>${esc(k)}</td><td>${esc(v)}</td>${c !== "-" ? `<td>${esc(c)}</td>` : ""}</tr>`;
  const ok = a.status === "SUCCEEDED";
  const cats = { lcp: a.field.lcpMs, inp: a.field.inpMs, cls: a.field.cls, fcp: a.field.fcpMs, ttfb: a.field.ttfbMs } as const;
  const lab = LAB_METRICS.filter((x) => x.unit !== "score").map((m) => row(m.label, formatValue(m.get(a), m.unit), "-")).join("");
  const field = FIELD_METRICS.map((m) => row(m.label, formatValue(m.get(a), m.unit), cats[m.key as keyof typeof cats]?.category?.toLowerCase() ?? "—")).join("");
  const unitOf = (r: BudgetResult) => LAB_METRICS.concat(FIELD_METRICS).find((m) => m.source === r.source && m.key === r.metric)?.unit ?? "ms";
  const bud = budgets.map((r) => `<tr><td>${esc(r.source)}</td><td>${esc(r.label)}</td><td>${esc(`${r.comparator} ${formatValue(r.threshold, unitOf(r))}`)}</td><td>${esc(formatValue(r.actual, unitOf(r)))}</td><td class="b-${r.status}">${esc(budgetLabel(r))}</td></tr>`).join("");
  const opps = a.opportunities.map((o) => `<li><strong>${esc(o.title)}</strong> <span class="muted">${esc(savings(o))}${o.displayValue ? ` · ${esc(o.displayValue)}` : ""}</span><p>${esc(o.description)}</p></li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VeloAudit report — ${esc(a.url)}</title>
<style>
:root{color-scheme:light;--b:#e4e4e7;--m:#71717a;--a:#4f46e5}*{box-sizing:border-box}body{font:14px/1.6 "Geist","Inter",ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:880px;margin:48px auto;padding:0 28px;color:#09090b;-webkit-font-smoothing:antialiased}
h1{font-size:26px;letter-spacing:-.03em;margin:0 0 6px;font-weight:650}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--m);margin:40px 0 12px;font-weight:600}
.muted{color:var(--m)}.score{font-size:56px;font-weight:650;letter-spacing:-.04em;font-variant-numeric:tabular-nums}table{border-collapse:separate;border-spacing:0;width:100%;border:1px solid var(--b);border-radius:12px;overflow:hidden}td,th{border-bottom:1px solid var(--b);padding:9px 14px;text-align:left;font-variant-numeric:tabular-nums}tr:last-child td{border-bottom:0}
th{font-weight:500;color:var(--m);background:#fafafa;font-size:12px}.note{background:#fafafa;border:1px solid var(--b);border-left:3px solid var(--a);border-radius:8px;padding:10px 14px;margin:10px 0;color:#3f3f46}
.b-pass{color:#15803d;font-weight:600}.b-fail{color:#b91c1c;font-weight:600}.b-not_evaluable{color:var(--m);font-style:italic}
li{margin:0 0 14px}li p{margin:4px 0 0;color:#52525b}code{font-family:ui-monospace,"Geist Mono",monospace}@media print{body{margin:0 auto}}
@media print{body{margin:0;max-width:none}.noprint{display:none}a{color:inherit;text-decoration:none}}
</style></head><body>
<p class="noprint"><button onclick="window.print()">Print / Save as PDF</button></p>
<h1>VeloAudit report</h1>
<div class="muted"><code>${esc(a.url)}</code> · ${esc(a.strategy)} · ${esc(a.fetchTime ?? a.completedAt ?? a.createdAt)} · Lighthouse ${esc(a.lighthouseVersion ?? "unknown")} · audit ${esc(a.id)}</div>
${ok ? `<h2>Performance score (lab)</h2><div class="score">${esc(formatValue(a.lab.score, "score"))}</div><div class="note">${esc(LAB_NOTE)}</div>
${a.categories.length ? `<h2>Lighthouse categories (lab)</h2><table><tr><th>Category</th><th>Score</th><th>Failed</th><th>Passed</th><th>Manual</th><th>Not applicable</th></tr>${a.categories.map((c) => `<tr><td>${esc(c.title)}</td><td><strong>${esc(formatValue(c.score, "score"))}</strong></td><td>${c.failed.length}</td><td>${c.passed.length}</td><td>${c.manual.length}</td><td>${c.notApplicable.length}</td></tr>`).join("")}</table>` : ""}
<h2>Lab metrics (Lighthouse)</h2><table><tr><th>Metric</th><th>Value</th></tr>${lab}</table>
<h2>Field metrics (CrUX, p75)</h2><p><strong>${esc(cwvLine(a))}</strong></p><div class="note">${esc(fieldScopeNote(a))}</div><table><tr><th>Metric</th><th>Value</th><th>Category</th></tr>${field}</table>
${budgets.length ? `<h2>Budgets</h2><table><tr><th>Source</th><th>Metric</th><th>Target</th><th>Actual</th><th>Result</th></tr>${bud}</table>` : ""}
<h2>Issues and fixes (from Lighthouse audits)</h2>${opps ? `<ol>${opps}</ol>` : `<p class="muted">Lighthouse reported no opportunities with savings for this run.</p>`}
${a.categories.filter((c) => c.id !== "performance").map((c) => `<h2>${esc(c.title)}: failed audits (${c.failed.length})</h2>${c.failed.length ? `<ul>${c.failed.map((f) => `<li><strong>${esc(f.title)}</strong>${f.group ? ` <span class="muted">· ${esc(f.group)}</span>` : ""}<p>${esc(f.description)}</p></li>`).join("")}</ul>` : `<p class="muted">No failed audits.</p>`}${c.manual.length ? `<p class="muted">Manual checks: ${c.manual.map((m) => esc(m.title)).join("; ")}</p>` : ""}`).join("")}
${a.diagnostics.length ? `<h2>Diagnostics</h2><ul>${a.diagnostics.map((o) => `<li><strong>${esc(o.title)}</strong>${o.displayValue ? ` <span class="muted">${esc(o.displayValue)}</span>` : ""}</li>`).join("")}</ul>` : ""}`
  : `<p>Audit did not complete: ${esc(a.error?.code ?? a.status)} ${esc(a.error?.message ?? "")}</p>`}
<p class="muted">Generated by VeloAudit from Google PageSpeed Insights data. Metrics are reported as measured; unavailable values are not estimated.</p>
</body></html>`;
}
