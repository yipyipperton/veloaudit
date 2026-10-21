import { NextResponse } from "next/server";
import { RunIdSchema } from "@/server/validation/schemas";
import { getRun } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";
import { readLimited } from "@/server/http/rateLimit";
import { runDto } from "@/server/http/serialize";
import { readOwner } from "@/server/http/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = safe("GET /api/runs/[id]", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!readLimited(req).ok) return jsonError(429, "RATE_LIMITED", "Too many requests");
  const { id } = await ctx.params;
  if (!RunIdSchema.safeParse(id).success) return jsonError(400, "INVALID_ID", "Invalid run id");
  const run = await getRun(id);
  if (!run) return jsonError(404, "NOT_FOUND", "Run not found");
  // The unguessable run id is a share-link capability: anyone holding it can view the run.
  const owner = readOwner(req);
  return NextResponse.json({ run: runDto(run), viewerIsOwner: owner !== null && run.ownerHash === owner });
});
