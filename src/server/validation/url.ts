import dns from "node:dns/promises";
import net from "node:net";
import { isBlockedIp } from "./ip";

export type UrlCheck = { ok: true; url: string; hostname: string } | { ok: false; reason: string };

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

/** Synchronous structural checks (no network). */
export function checkUrlSyntax(input: string): UrlCheck {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return { ok: false, reason: "URL must be 1-2048 characters" };
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, reason: "Only http and https URLs are allowed" };
  if (u.username !== "" || u.password !== "") return { ok: false, reason: "URLs with embedded credentials are not allowed" };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "") return { ok: false, reason: "URL must include a host" };
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)))
    return { ok: false, reason: "Local hostnames are not allowed" };
  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare) !== 0) {
    if (isBlockedIp(bare)) return { ok: false, reason: "Private, loopback, or link-local addresses are not allowed" };
  } else if (!host.includes(".")) {
    return { ok: false, reason: "Hostname must be a fully-qualified public domain" };
  }
  u.hash = "";
  return { ok: true, url: u.toString(), hostname: bare };
}

export type Resolver = (host: string) => Promise<string[]>;
const systemResolver: Resolver = async (host) => (await dns.lookup(host, { all: true, verbatim: true })).map((a) => a.address);

/** DNS-over-HTTPS (Google) resolver for hosts whose system DNS returns synthetic/fake IPs (e.g. sandbox egress proxies). */
export const dohResolver: Resolver = async (host) => {
  const out: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`DoH HTTP ${res.status}`);
    const json = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
    for (const a of json.Answer ?? []) if (a.type === 1 || a.type === 28) out.push(a.data);
  }
  return out;
};

const defaultResolver: Resolver = (host) => (process.env.DNS_RESOLVER === "doh" ? dohResolver(host) : systemResolver(host));

/** Full validation including DNS resolution: every resolved address must be public. */
export async function validatePublicUrl(input: string, resolve: Resolver = defaultResolver): Promise<UrlCheck> {
  const syntax = checkUrlSyntax(input);
  if (!syntax.ok) return syntax;
  if (net.isIP(syntax.hostname) !== 0) return syntax;
  let addrs: string[];
  try {
    addrs = await resolve(syntax.hostname);
  } catch {
    return { ok: false, reason: "Hostname could not be resolved" };
  }
  if (addrs.length === 0) return { ok: false, reason: "Hostname could not be resolved" };
  if (addrs.some((a) => isBlockedIp(a))) return { ok: false, reason: "Hostname resolves to a private or local address" };
  return syntax;
}
