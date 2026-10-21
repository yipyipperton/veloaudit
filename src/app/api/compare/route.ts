import { NextResponse } from "next/server";
import { AuditIdSchema } from "@/server/validation/schemas";
import { getAudit } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { readLimited } from "@/server/http/rateLimit";
import { toDto } from "@/server/http/serialize";
import { COMPARE_CAVEAT, compareAudits } from "@/lib/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = safe("GET /api/compare", async (req: Request) => {
  if (!readLimited(req).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const sp = new URL(req.url).searchParams;
  const a = sp.get("a") ?? "", b = sp.get("b") ?? "";
  if (!AuditIdSchema.safeParse(a).success || !AuditIdSchema.safeParse(b).success) return jsonError(400, "INVALID_ID", "Provide two audit ids as ?a=&b=");
  const [ra, rb] = await Promise.all([getAudit(a), getAudit(b)]);
  if (!ra || !rb) return jsonError(404, "NOT_FOUND", "Audit not found");
  const [before, after] = ra.createdAt <= rb.createdAt ? [toDto(ra), toDto(rb)] : [toDto(rb), toDto(ra)];
  const result = compareAudits(before, after);
  if (!result.ok) return jsonError(422, "NOT_COMPARABLE", result.reason);
  return NextResponse.json({ before, after, deltas: result.deltas, caveat: COMPARE_CAVEAT });
});
