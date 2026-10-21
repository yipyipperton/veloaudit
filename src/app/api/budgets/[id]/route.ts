import { AuditIdSchema } from "@/server/validation/schemas";
import { deleteBudget } from "@/server/persistence/budgets";
import { jsonError, safe } from "@/server/http/errors";
import { clientIp, rateLimit } from "@/server/http/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = safe("DELETE /api/budgets/[id]", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!rateLimit(`budget:${clientIp(req)}`, 30, 60_000).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const { id } = await ctx.params;
  if (!AuditIdSchema.safeParse(id).success) return jsonError(400, "INVALID_ID", "Invalid budget id");
  if (!(await deleteBudget(id))) return jsonError(404, "NOT_FOUND", "Budget not found");
  return new Response(null, { status: 204 });
});
