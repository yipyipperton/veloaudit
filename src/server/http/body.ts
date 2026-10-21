import { jsonError } from "./errors";

/** Read a small JSON body with content-type and size guards. */
export async function readJson(req: Request, maxBytes = 4096): Promise<{ ok: true; body: unknown } | { ok: false; res: Response }> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json"))
    return { ok: false, res: jsonError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json") };
  const raw = await req.text();
  if (raw.length > maxBytes) return { ok: false, res: jsonError(413, "PAYLOAD_TOO_LARGE", "Request body too large") };
  try { return { ok: true, body: JSON.parse(raw) as unknown }; }
  catch { return { ok: false, res: jsonError(400, "INVALID_JSON", "Request body must be JSON") }; }
}

export function firstIssue(err: { issues: ReadonlyArray<{ message: string; path: ReadonlyArray<PropertyKey> }> }): string {
  const i = err.issues[0];
  if (!i) return "Invalid input";
  const p = i.path.map(String).join(".");
  return p ? `${p}: ${i.message}` : i.message;
}
