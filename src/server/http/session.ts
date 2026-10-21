import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "../env";
import { logger } from "../logger";

/**
 * Anonymous owner session (no accounts). The cookie carries a random 256-bit owner id plus an HMAC-SHA256
 * signature keyed by SESSION_SECRET. The database only ever stores sha256(ownerId), so a DB leak does not
 * yield usable cookies, and a client cannot forge or alter an owner id without the secret.
 */
export const OWNER_COOKIE = "__Host-va_owner";
const VERSION = "v1";
const MAX_AGE_S = 60 * 60 * 24 * 365;
const DEV_SECRET = "dev-only-insecure-session-secret-change-me-0000";

let warned = false;
function secret(): string {
  const s = getEnv().SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  if (!warned) { logger.warn("session.dev_secret", { note: "SESSION_SECRET unset; using an insecure development secret" }); warned = true; }
  return DEV_SECRET;
}

const sign = (ownerId: string, key = secret()) => createHmac("sha256", key).update(`${VERSION}.${ownerId}`).digest("base64url");
export const hashOwner = (ownerId: string): string => createHash("sha256").update(ownerId).digest("hex");

export function encodeOwnerCookie(ownerId: string, key?: string): string {
  return `${VERSION}.${ownerId}.${sign(ownerId, key)}`;
}

/** Returns the owner id if the value is well-formed AND correctly signed; otherwise null (tampered, foreign, or garbage). */
export function verifyOwnerCookie(value: string | undefined | null, key?: string): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const [, id, sig] = parts as [string, string, string];
  if (!/^[A-Za-z0-9_-]{43}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return null;
  const want = Buffer.from(sign(id, key), "base64url");
  const got = Buffer.from(sig, "base64url");
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export type Owner = { hash: string; setCookie: string | null };

/** Caller's owner hash, or null when there is no valid signed cookie. Never creates a session. */
export function readOwner(req: Request): string | null {
  const id = verifyOwnerCookie(readCookie(req, OWNER_COOKIE));
  return id ? hashOwner(id) : null;
}

/** Caller's owner, creating a fresh random owner (and Set-Cookie) when missing or invalid. */
export function ensureOwner(req: Request): Owner {
  const existing = readOwner(req);
  if (existing) return { hash: existing, setCookie: null };
  const id = randomBytes(32).toString("base64url");
  const cookie = `${OWNER_COOKIE}=${encodeOwnerCookie(id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_S}`;
  return { hash: hashOwner(id), setCookie: cookie };
}

export function withOwnerCookie<T extends Response>(res: T, owner: Owner): T {
  if (owner.setCookie) res.headers.append("set-cookie", owner.setCookie);
  return res;
}
