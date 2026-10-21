import { describe, expect, it } from "vitest";
import { OWNER_COOKIE, encodeOwnerCookie, ensureOwner, hashOwner, readOwner, verifyOwnerCookie } from "@/server/http/session";

const KEY = "unit-test-session-secret-0123456789abcdef"; // SYNTHETIC test key
const ID = "x".repeat(43);
const reqWith = (cookie?: string) => new Request("http://t/", { headers: cookie ? { cookie } : {} });

describe("owner cookie signing", () => {
  it("round-trips a signed owner id", () => {
    expect(verifyOwnerCookie(encodeOwnerCookie(ID, KEY), KEY)).toBe(ID);
  });
  it("rejects a tampered owner id, signature, version, or a different key", () => {
    const v = encodeOwnerCookie(ID, KEY);
    const [ver, id, sig] = v.split(".") as [string, string, string];
    expect(verifyOwnerCookie(`${ver}.${"y".repeat(43)}.${sig}`, KEY)).toBeNull();
    expect(verifyOwnerCookie(`${ver}.${id}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`, KEY)).toBeNull();
    expect(verifyOwnerCookie(`v2.${id}.${sig}`, KEY)).toBeNull();
    expect(verifyOwnerCookie(v, `${KEY}-other`)).toBeNull();
  });
  it.each(["", "garbage", "v1..", "v1.a.b", `v1.${ID}`, `v1.${ID}.${"z".repeat(44)}`, `v1.${"!".repeat(43)}.${"a".repeat(43)}`])("rejects malformed %j", (v) => {
    expect(verifyOwnerCookie(v, KEY)).toBeNull();
  });
});

describe("session helpers", () => {
  it("issues a fresh random owner with hardened cookie attributes when absent", () => {
    const a = ensureOwner(reqWith()), b = ensureOwner(reqWith());
    expect(a.setCookie).toMatch(new RegExp(`^${OWNER_COOKIE}=v1\\.[A-Za-z0-9_-]{43}\\.[A-Za-z0-9_-]{43}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=\\d+$`));
    expect(a.hash).not.toBe(b.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("reuses a valid cookie and stores only the sha256 of the owner id", () => {
    const issued = ensureOwner(reqWith());
    const cookie = issued.setCookie!.split(";")[0]!;
    const again = ensureOwner(reqWith(`other=1; ${cookie}`));
    expect(again).toEqual({ hash: issued.hash, setCookie: null });
    const id = cookie.split("=")[1]!.split(".")[1]!;
    expect(issued.hash).toBe(hashOwner(id));
    expect(issued.hash).not.toContain(id);
  });
  it("treats a tampered cookie as anonymous and replaces it on write", () => {
    const cookie = ensureOwner(reqWith()).setCookie!.split(";")[0]!;
    const tampered = cookie.replace(/\.([A-Za-z0-9_-])/, (_m, c: string) => `.${c === "a" ? "b" : "a"}`);
    expect(readOwner(reqWith(tampered))).toBeNull();
    expect(ensureOwner(reqWith(tampered)).setCookie).not.toBeNull();
  });
});
