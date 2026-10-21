import { NextResponse } from "next/server";
import { CreateAuditSchema } from "@/server/validation/schemas";
import { validatePublicUrl } from "@/server/validation/url";
import { enqueueAudit } from "@/server/orchestration/audits";
import { listAudits } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { clientIp, rateLimit } from "@/server/http/rateLimit";
import { toDto } from "@/server/http/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = safe("POST /api/audits", async (req: Request) => {
  const rl = rateLimit(`create:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return jsonError(429, "RATE_LIMITED", "Too many audits requested; try again later", { "retry-after": String(rl.retryAfterS) });
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError(400, "INVALID_JSON", "Request body must be JSON"); }
  const parsed = CreateAuditSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "INVALID_INPUT", "Provide { url: string, strategy: 'mobile' | 'desktop' }");
  const check = await validatePublicUrl(parsed.data.url);
  if (!check.ok) return jsonError(400, "INVALID_URL", check.reason);
  const audit = await enqueueAudit(check.url, parsed.data.strategy);
  return NextResponse.json({ audit: toDto(audit) }, { status: 202 });
});

export const GET = safe("GET /api/audits", async (req: Request) => {
  const rl = rateLimit(`read:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const audits = await listAudits(25);
  return NextResponse.json({ audits: audits.map(toDto) });
});
