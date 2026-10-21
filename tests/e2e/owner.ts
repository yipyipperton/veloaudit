import { randomBytes } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { OWNER_COOKIE, encodeOwnerCookie, hashOwner } from "../../src/server/http/session";

/**
 * Gives a browser context its own SYNTHETIC anonymous owner by setting a cookie signed with the
 * same SESSION_SECRET the app server uses, and returns the owner hash for seeding rows directly in the DB.
 */
export type OwnerCookie = Parameters<BrowserContext["addCookies"]>[0][number];
export function newOwnerCookie(baseURL: string): { hash: string; cookie: OwnerCookie } {
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error("SESSION_SECRET must be set for e2e tests (same value as the app server)");
  const id = randomBytes(32).toString("base64url");
  return { hash: hashOwner(id), cookie: { name: OWNER_COOKIE, value: encodeOwnerCookie(id, key),
    // CDP refuses Secure cookies for http:// URLs; Chromium still sends them to http://localhost (treated as secure).
    url: baseURL.replace(/^http:/, "https:"), httpOnly: true, secure: true, sameSite: "Lax" } };
}
export async function asNewOwner(context: BrowserContext, baseURL: string): Promise<string> {
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error("SESSION_SECRET must be set for e2e tests (same value as the app server)");
  const id = randomBytes(32).toString("base64url");
  await context.addCookies([{ name: OWNER_COOKIE, value: encodeOwnerCookie(id, key),
    // CDP refuses Secure cookies for http:// URLs; Chromium still sends them to http://localhost (treated as secure).
    url: baseURL.replace(/^http:/, "https:"), httpOnly: true, secure: true, sameSite: "Lax" }]);
  return hashOwner(id);
}
