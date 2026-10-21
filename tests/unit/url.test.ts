import { describe, expect, it } from "vitest";
import { checkUrlSyntax, validatePublicUrl } from "@/server/validation/url";
import { isBlockedIp } from "@/server/validation/ip";

describe("checkUrlSyntax", () => {
  it.each(["https://example.com", "http://web.dev/path?q=1", "https://93.184.215.14/"])("accepts %s", (u) => {
    expect(checkUrlSyntax(u).ok).toBe(true);
  });
  it.each([
    ["ftp://example.com", /http and https/],
    ["javascript:alert(1)", /http and https/],
    ["file:///etc/passwd", /http and https/],
    ["https://user:pass@example.com", /credentials/],
    ["https://user@example.com", /credentials/],
    ["http://localhost:3000", /Local/],
    ["http://foo.localhost", /Local/],
    ["http://127.0.0.1", /Private/],
    ["http://10.1.2.3", /Private/],
    ["http://192.168.0.1", /Private/],
    ["http://172.20.0.1", /Private/],
    ["http://169.254.169.254/latest/meta-data", /Private/],
    ["http://[::1]/", /Private/],
    ["http://[fe80::1]/", /Private/],
    ["http://[fd00::1]/", /Private/],
    ["http://[::ffff:127.0.0.1]/", /Private/],
    ["http://0x7f000001/", /Private/],
    ["http://intranet", /fully-qualified/],
    ["not a url", /Invalid/],
  ])("rejects %s", (u, re) => {
    const r = checkUrlSyntax(u);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(re);
  });
  it("strips the fragment", () => {
    const r = checkUrlSyntax("https://example.com/a#frag");
    expect(r.ok && r.url).toBe("https://example.com/a");
  });
});

describe("validatePublicUrl (DNS)", () => {
  it("rejects hostnames resolving to private addresses", async () => {
    expect((await validatePublicUrl("https://evil.example", async () => ["93.184.215.14", "10.0.0.5"])).ok).toBe(false);
  });
  it("accepts hostnames resolving only to public addresses", async () => {
    expect((await validatePublicUrl("https://ok.example", async () => ["93.184.215.14"])).ok).toBe(true);
  });
  it("rejects unresolvable hostnames", async () => {
    expect((await validatePublicUrl("https://nx.example", async () => { throw new Error("ENOTFOUND"); })).ok).toBe(false);
  });
});

describe("isBlockedIp", () => {
  it("classifies addresses", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("2606:4700::1111")).toBe(false);
    expect(isBlockedIp("100.64.0.1")).toBe(true);
    expect(isBlockedIp("0.0.0.0")).toBe(true);
  });
});
