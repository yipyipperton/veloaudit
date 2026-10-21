import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as HISTORY } from "@/app/api/history/route";
import { GET as COMPARE } from "@/app/api/compare/route";
import { GET as BUDGETS, POST as POST_BUDGET } from "@/app/api/budgets/route";
import { DELETE as DELETE_BUDGET } from "@/app/api/budgets/[id]/route";
import { GET as REPORT } from "@/app/api/audits/[id]/report/route";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import { parsePsiResponse } from "@/server/psi/parser";
import { SYNTHETIC_PSI_NO_FIELD } from "../fixtures/psi-synthetic";
import { OWNER_A, cookieFor, hashFor, resetDb, syntheticPsi } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const U = "https://synthetic.invalid/";
async function seed(strategy: "MOBILE" | "DESKTOP", payload: unknown, day: number) {
  const a = await repo.createAudit(U, strategy, hashFor(OWNER_A));
  await prisma.audit.update({ where: { id: a.id }, data: { createdAt: new Date(Date.UTC(2000, 0, day)) } });
  return repo.saveResult(a.id, parsePsiResponse(payload));
}
let ip = 0;
const req = (path: string, init: RequestInit = {}) =>
  new Request(`http://t${path}`, { ...init, headers: { "x-forwarded-for": `192.0.2.${++ip % 250}`, cookie: cookieFor(OWNER_A), ...(init.headers ?? {}) } });
const postBudget = (body: unknown) => POST_BUDGET(req("/api/budgets", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

describe("GET /api/history", () => {
  it("returns completed audits oldest-first, normalizing the URL", async () => {
    const a = await seed("MOBILE", syntheticPsi(), 1);
    const b = await seed("MOBILE", SYNTHETIC_PSI_NO_FIELD, 2);
    await seed("DESKTOP", syntheticPsi(), 3);
    const r = await HISTORY(req(`/api/history?url=${encodeURIComponent("https://synthetic.invalid")}&strategy=mobile`));
    expect(r.status).toBe(200);
    const j = (await r.json()) as { url: string; audits: Array<{ id: string; field: { inpMs: unknown } }> };
    expect(j.url).toBe(U);
    expect(j.audits.map((x) => x.id)).toEqual([a.id, b.id]);
    expect(j.audits[1]?.field.inpMs).toBeNull();
  });
  it.each(["?url=ftp://x.com&strategy=mobile", "?url=https://x.com&strategy=tv", "?strategy=mobile", "?url=http://127.0.0.1&strategy=mobile"])("400 for %s", async (q) => {
    expect((await HISTORY(req(`/api/history${q}`))).status).toBe(400);
  });
});

describe("GET /api/compare", () => {
  it("orders before/after by time and returns deltas + caveat", async () => {
    const a = await seed("MOBILE", syntheticPsi(), 1);
    const b = await seed("MOBILE", SYNTHETIC_PSI_NO_FIELD, 2);
    const r = await COMPARE(req(`/api/compare?a=${b.id}&b=${a.id}`));
    expect(r.status).toBe(200);
    const j = (await r.json()) as { before: { id: string }; after: { id: string }; caveat: string; deltas: Array<{ def: { source: string; key: string }; verdict: string }> };
    expect(j.before.id).toBe(a.id);
    expect(j.after.id).toBe(b.id);
    expect(j.caveat).toMatch(/run to run/);
    expect(j.deltas.find((d) => d.def.source === "field" && d.def.key === "inp")?.verdict).toBe("not_comparable");
  });
  it("422 for different strategies, 400 bad ids, 404 unknown", async () => {
    const a = await seed("MOBILE", syntheticPsi(), 1);
    const d = await seed("DESKTOP", syntheticPsi(), 2);
    expect((await COMPARE(req(`/api/compare?a=${a.id}&b=${d.id}`))).status).toBe(422);
    expect((await COMPARE(req(`/api/compare?a=x&b=y`))).status).toBe(400);
    expect((await COMPARE(req(`/api/compare?a=${a.id}&b=${"c".repeat(25)}`))).status).toBe(404);
  });
});

describe("budgets API", () => {
  it("creates, evaluates against latest audit (not evaluable when field missing), and deletes", async () => {
    await seed("MOBILE", syntheticPsi(), 1);
    const latest = await seed("MOBILE", SYNTHETIC_PSI_NO_FIELD, 2);
    const r1 = await postBudget({ url: "https://synthetic.invalid", strategy: "mobile", source: "field", metric: "inp", threshold: 200 });
    expect(r1.status).toBe(201);
    expect((await postBudget({ url: U, strategy: "mobile", source: "lab", metric: "lcp", threshold: 1000 })).status).toBe(201);
    const g = await BUDGETS(req(`/api/budgets?url=${encodeURIComponent(U)}&strategy=mobile`));
    const j = (await g.json()) as { evaluatedAuditId: string; budgets: Array<{ id: string }>; results: Array<{ source: string; metric: string; status: string; actual: number | null }> };
    expect(j.evaluatedAuditId).toBe(latest.id);
    expect(j.results.find((x) => x.source === "field")).toMatchObject({ status: "not_evaluable", actual: null });
    expect(j.results.find((x) => x.source === "lab")).toMatchObject({ status: "pass", actual: 800 });
    const id = j.budgets[0]!.id;
    expect((await DELETE_BUDGET(req(`/api/budgets/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) })).status).toBe(204);
    expect((await DELETE_BUDGET(req(`/api/budgets/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) })).status).toBe(404);
  });
  it("evaluates against a specific auditId and rejects mismatched audits", async () => {
    const first = await seed("MOBILE", syntheticPsi(), 1);
    const desk = await seed("DESKTOP", syntheticPsi(), 2);
    await postBudget({ url: U, strategy: "mobile", source: "field", metric: "inp", threshold: 200 });
    const g = await BUDGETS(req(`/api/budgets?url=${encodeURIComponent(U)}&strategy=mobile&auditId=${first.id}`));
    expect(((await g.json()) as { results: Array<{ status: string }> }).results[0]?.status).toBe("pass");
    expect((await BUDGETS(req(`/api/budgets?url=${encodeURIComponent(U)}&strategy=mobile&auditId=${desk.id}`))).status).toBe(404);
  });
  it.each([
    [{ url: U, strategy: "mobile", source: "lab", metric: "inp", threshold: 200 }, 400],
    [{ url: U, strategy: "mobile", source: "field", metric: "lcp", threshold: "fast" }, 400],
    [{ url: "http://10.0.0.1/", strategy: "mobile", source: "lab", metric: "lcp", threshold: 1 }, 400],
  ])("rejects invalid budget %j", async (body, code) => {
    const r = await postBudget(body);
    expect(r.status).toBe(code);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe("INVALID_INPUT");
  });
  it("415 when not JSON", async () => {
    expect((await POST_BUDGET(req("/api/budgets", { method: "POST", body: "x", headers: { "content-type": "text/plain" } }))).status).toBe(415);
  });
});

describe("report API", () => {
  it("serves markdown and html with download headers and CSP", async () => {
    const a = await seed("MOBILE", syntheticPsi(), 1);
    const ctx = { params: Promise.resolve({ id: a.id }) };
    const md = await REPORT(req(`/api/audits/${a.id}/report?format=md&download=1`), ctx);
    expect(md.headers.get("content-type")).toContain("text/markdown");
    expect(md.headers.get("content-disposition")).toContain(`veloaudit-${a.id}.md`);
    expect(await md.text()).toContain("## Field metrics (CrUX, p75)");
    const html = await REPORT(req(`/api/audits/${a.id}/report?format=html`), { params: Promise.resolve({ id: a.id }) });
    expect(html.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(html.headers.get("content-disposition")).toBeNull();
    expect(await html.text()).toContain("<h2>Lab metrics (Lighthouse)</h2>");
  });
  it("400 for bad format, 404 for unknown id", async () => {
    const a = await seed("MOBILE", syntheticPsi(), 1);
    expect((await REPORT(req(`/api/audits/${a.id}/report?format=pdf`), { params: Promise.resolve({ id: a.id }) })).status).toBe(400);
    const id = "c".repeat(25);
    expect((await REPORT(req(`/api/audits/${id}/report`), { params: Promise.resolve({ id }) })).status).toBe(404);
  });
});
