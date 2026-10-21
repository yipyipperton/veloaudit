import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST, GET } from "@/app/api/audits/route";
import { GET as GET_ONE } from "@/app/api/audits/[id]/route";
import { prisma } from "@/server/persistence/db";
import { auditQueue } from "@/server/orchestration/queue";
import { resetDb } from "./helpers";

let ipCounter = 0;
const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request("http://t/api/audits", { method: "POST", body, headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${++ipCounter}`, ...headers } }));
const json = async (r: Response) => (await r.json()) as { error?: { code: string; message: string }; audit?: { id: string; status: string; strategy: string } };

beforeEach(async () => { await resetDb(); await auditQueue().obliterate({ force: true }); });
afterAll(async () => { await auditQueue().close(); await prisma.$disconnect(); });

describe("POST /api/audits validation", () => {
  it.each([
    ["{}", "INVALID_INPUT"],
    ['{"url":"https://example.com"}', "INVALID_INPUT"],
    ['{"url":"https://example.com","strategy":"tablet"}', "INVALID_INPUT"],
    ['{"url":"https://example.com","strategy":"mobile","extra":1}', "INVALID_INPUT"],
    ['{"url":123,"strategy":"mobile"}', "INVALID_INPUT"],
    ['{"url":"gopher://x.com","strategy":"mobile"}', "INVALID_URL"],
    ['{"url":"https://a:b@example.com","strategy":"mobile"}', "INVALID_URL"],
    ['{"url":"http://169.254.169.254","strategy":"mobile"}', "INVALID_URL"],
    ['{"url":"http://[fd12::1]","strategy":"mobile"}', "INVALID_URL"],
    ['{"url":"http://nonexistent-host-zz9.invalid","strategy":"mobile"}', "INVALID_URL"],
    ["not json", "INVALID_JSON"],
    ["[]", "INVALID_INPUT"],
  ])("%s -> 400 %s", async (body, code) => {
    const r = await post(body);
    expect(r.status).toBe(400);
    const j = await json(r);
    expect(j.error?.code).toBe(code);
    expect(JSON.stringify(j)).not.toMatch(/at .*\.ts|stack/i);
  });

  it("415 for non-JSON content type", async () => {
    expect((await post("{}", { "content-type": "text/plain" })).status).toBe(415);
  });
  it("413 for oversized body", async () => {
    expect((await post(JSON.stringify({ url: "https://example.com/" + "a".repeat(5000), strategy: "mobile" }))).status).toBe(413);
  });
  it("429 after 10 creates per minute from one IP", async () => {
    const h = { "x-forwarded-for": "198.51.100.77" };
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await post("{}", h)).status);
    expect(codes.slice(0, 10).every((c) => c === 400)).toBe(true);
    expect(codes[10]).toBe(429);
  });
  it("202 creates a QUEUED audit for an IP-literal public URL and enqueues it", async () => {
    const r = await post('{"url":"https://8.8.8.8/","strategy":"desktop"}');
    expect(r.status).toBe(202);
    const j = await json(r);
    expect(j.audit?.status).toBe("QUEUED");
    expect(j.audit?.strategy).toBe("desktop");
    expect(await auditQueue().getJob(j.audit!.id)).toBeTruthy();
  });
});

describe("GET endpoints", () => {
  it("400 for malformed id, 404 for unknown id", async () => {
    const bad = await GET_ONE(new Request("http://t/x"), { params: Promise.resolve({ id: "../etc" }) });
    expect(bad.status).toBe(400);
    const nf = await GET_ONE(new Request("http://t/x"), { params: Promise.resolve({ id: "c".repeat(25) }) });
    expect(nf.status).toBe(404);
  });
  it("lists audits", async () => {
    await post('{"url":"https://8.8.4.4/","strategy":"mobile"}');
    const r = await GET(new Request("http://t/api/audits"));
    expect(((await r.json()) as { audits: unknown[] }).audits).toHaveLength(1);
  });
});
