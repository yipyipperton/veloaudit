import { z } from "zod";
import { AuditIdSchema } from "@/server/validation/schemas";
import { getAudit } from "@/server/persistence/audits";
import { listBudgets } from "@/server/persistence/budgets";
import { jsonError, safe } from "@/server/http/errors";
import { readLimited } from "@/server/http/rateLimit";
import { budgetDto, toDto } from "@/server/http/serialize";
import { evaluateBudgets } from "@/lib/budgets";
import { renderHtml, renderMarkdown } from "@/server/report/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({ format: z.enum(["md", "html"]).default("html"), download: z.enum(["0", "1"]).default("0") });

export const GET = safe("GET /api/audits/[id]/report", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!readLimited(req).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const { id } = await ctx.params;
  if (!AuditIdSchema.safeParse(id).success) return jsonError(400, "INVALID_ID", "Invalid audit id");
  const sp = new URL(req.url).searchParams;
  const q = Query.safeParse({ format: sp.get("format") ?? undefined, download: sp.get("download") ?? undefined });
  if (!q.success) return jsonError(400, "INVALID_INPUT", "format must be md or html");
  const row = await getAudit(id);
  if (!row) return jsonError(404, "NOT_FOUND", "Audit not found");
  const audit = toDto(row);
  const budgets = (await listBudgets(row.url, row.strategy)).map(budgetDto);
  const results = evaluateBudgets(budgets, audit);
  const isMd = q.data.format === "md";
  const body = isMd ? renderMarkdown(audit, results) : renderHtml(audit, results);
  const headers: Record<string, string> = {
    "content-type": isMd ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
  };
  if (q.data.download === "1") headers["content-disposition"] = `attachment; filename="veloaudit-${id}.${isMd ? "md" : "html"}"`;
  return new Response(body, { status: 200, headers });
});
