import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateBudgetSchema, HistoryQuerySchema } from "@/server/validation/budgets";
import { AuditIdSchema } from "@/server/validation/schemas";
import { listBudgets, upsertBudget } from "@/server/persistence/budgets";
import { getAudit, listHistory } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { firstIssue, readJson } from "@/server/http/body";
import { clientIp, rateLimit, readLimited } from "@/server/http/rateLimit";
import { budgetDto, toDto } from "@/server/http/serialize";
import { evaluateBudgets } from "@/lib/budgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toStrategy = (s: "mobile" | "desktop"): "MOBILE" | "DESKTOP" => (s === "mobile" ? "MOBILE" : "DESKTOP");

/** List budgets for url+strategy, evaluated against ?auditId= or the latest successful audit. */
export const GET = safe("GET /api/budgets", async (req: Request) => {
  if (!readLimited(req).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const sp = new URL(req.url).searchParams;
  const q = HistoryQuerySchema.safeParse({ url: sp.get("url") ?? "", strategy: sp.get("strategy") ?? "" });
  if (!q.success) return jsonError(400, "INVALID_INPUT", firstIssue(q.error));
  const strategy = toStrategy(q.data.strategy);
  const budgets = (await listBudgets(q.data.url, strategy)).map(budgetDto);
  const auditId = sp.get("auditId");
  let audit = null;
  if (auditId) {
    if (!z.string().pipe(AuditIdSchema).safeParse(auditId).success) return jsonError(400, "INVALID_ID", "Invalid audit id");
    const row = await getAudit(auditId);
    if (!row || row.url !== q.data.url || row.strategy !== strategy) return jsonError(404, "NOT_FOUND", "Audit not found for this URL/strategy");
    audit = toDto(row);
  } else {
    const hist = await listHistory(q.data.url, strategy, 1);
    audit = hist[0] ? toDto(hist[0]) : null;
  }
  return NextResponse.json({
    budgets,
    evaluatedAuditId: audit?.id ?? null,
    results: audit ? evaluateBudgets(budgets, audit) : budgets.map((b) => ({ ...b, status: "not_evaluable", actual: null, reason: "No completed audit yet" })),
  });
});

export const POST = safe("POST /api/budgets", async (req: Request) => {
  if (!rateLimit(`budget:${clientIp(req)}`, 30, 60_000).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const body = await readJson(req);
  if (!body.ok) return body.res;
  const p = CreateBudgetSchema.safeParse(body.body);
  if (!p.success) return jsonError(400, "INVALID_INPUT", firstIssue(p.error));
  const b = await upsertBudget({ ...p.data, strategy: toStrategy(p.data.strategy), source: p.data.source === "lab" ? "LAB" : "FIELD" });
  return NextResponse.json({ budget: budgetDto(b) }, { status: 201 });
});
