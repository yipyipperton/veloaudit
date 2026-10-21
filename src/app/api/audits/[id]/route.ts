import { NextResponse } from "next/server";
import { AuditIdSchema } from "@/server/validation/schemas";
import { getAudit } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { clientIp, rateLimit } from "@/server/http/rateLimit";
import { toDto } from "@/server/http/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = safe("GET /api/audits/[id]", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const rl = rateLimit(`read:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const { id } = await ctx.params;
  if (!AuditIdSchema.safeParse(id).success) return jsonError(400, "INVALID_ID", "Invalid audit id");
  const audit = await getAudit(id);
  if (!audit) return jsonError(404, "NOT_FOUND", "Audit not found");
  return NextResponse.json({ audit: toDto(audit) });
});
