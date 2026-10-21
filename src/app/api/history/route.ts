import { NextResponse } from "next/server";
import { HistoryQuerySchema } from "@/server/validation/budgets";
import { listHistory } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { firstIssue } from "@/server/http/body";
import { readLimited } from "@/server/http/rateLimit";
import { toDto } from "@/server/http/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = safe("GET /api/history", async (req: Request) => {
  if (!readLimited(req).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const sp = new URL(req.url).searchParams;
  const q = HistoryQuerySchema.safeParse({ url: sp.get("url") ?? "", strategy: sp.get("strategy") ?? "" });
  if (!q.success) return jsonError(400, "INVALID_INPUT", firstIssue(q.error));
  const rows = await listHistory(q.data.url, q.data.strategy === "mobile" ? "MOBILE" : "DESKTOP");
  return NextResponse.json({ url: q.data.url, strategy: q.data.strategy, audits: rows.map((a) => toDto(a)) });
});
