import { AssetQuerySchema, AuditIdSchema } from "@/server/validation/schemas";
import { getAsset } from "@/server/persistence/audits";
import { jsonError, safe } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves Lighthouse screenshots stored at audit time (decoded from PSI's data URIs).
 * Immutable per audit, so they are cached aggressively; sandboxed CSP + nosniff since the bytes come from a third party.
 */
export const GET = safe("GET /api/audits/[id]/screenshot", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!AuditIdSchema.safeParse(id).success) return jsonError(400, "INVALID_ID", "Invalid audit id");
  const sp = new URL(req.url).searchParams;
  const q = AssetQuerySchema.safeParse({ kind: sp.get("kind"), i: sp.get("i") ?? "0" });
  if (!q.success) return jsonError(400, "INVALID_INPUT", "Provide kind=final|thumb and i=<index>");
  const asset = await getAsset(id, q.data.kind, q.data.i);
  if (!asset) return jsonError(404, "NOT_FOUND", "Screenshot not found");
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "content-type": asset.mime, "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox",
    },
  });
});
