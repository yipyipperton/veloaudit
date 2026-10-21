import { NextResponse, after } from "next/server";
import { CreateAuditSchema } from "@/server/validation/schemas";
import { validatePublicUrl } from "@/server/validation/url";
import { enqueueAudit, QueueUnavailableError } from "@/server/orchestration/audits";
import { listAudits } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { readJson } from "@/server/http/body";
import { clientIp, rateLimit, readLimited } from "@/server/http/rateLimit";
import { toDto } from "@/server/http/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Only matters in AUDIT_EXECUTION_MODE=inline (demo), where the PSI call runs via after() in this function.
export const maxDuration = 300;

export const POST = safe("POST /api/audits", async (req: Request) => {
  const rl = rateLimit(`create:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return jsonError(429, "RATE_LIMITED", "Too many audits requested; try again later", { "retry-after": String(rl.retryAfterS) });
  const body = await readJson(req);
  if (!body.ok) return body.res;
  const parsed = CreateAuditSchema.safeParse(body.body);
  if (!parsed.success) return jsonError(400, "INVALID_INPUT", "Provide { url: string, strategy: 'mobile' | 'desktop' }");
  const check = await validatePublicUrl(parsed.data.url);
  if (!check.ok) return jsonError(400, "INVALID_URL", check.reason);
  try {
    const audit = await enqueueAudit(check.url, parsed.data.strategy, { schedule: (task) => after(task) });
    return NextResponse.json({ audit: toDto(audit) }, { status: 202 });
  } catch (err) {
    if (err instanceof QueueUnavailableError) return jsonError(503, "QUEUE_UNAVAILABLE", "Audit queue is temporarily unavailable");
    throw err;
  }
});

export const GET = safe("GET /api/audits", async (req: Request) => {
  if (!readLimited(req).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const audits = await listAudits(25);
  return NextResponse.json({ audits: audits.map(toDto) });
});
