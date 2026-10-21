import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as LIST, POST } from "@/app/api/audits/route";
import { GET as GET_RUN } from "@/app/api/runs/[id]/route";
import { GET as GET_AUDIT } from "@/app/api/audits/[id]/route";
import { GET as REPORT } from "@/app/api/audits/[id]/report/route";
import { GET as HISTORY } from "@/app/api/history/route";
import { GET as COMPARE } from "@/app/api/compare/route";
import { GET as BUDGETS, POST as POST_BUDGET } from "@/app/api/budgets/route";
import { DELETE as DELETE_BUDGET } from "@/app/api/budgets/[id]/route";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import { auditQueue } from "@/server/orchestration/queue";
import { parsePsiResponse } from "@/server/psi/parser";
import { OWNER_A, OWNER_B, cookieFor, hashFor, replayCookie, resetDb, syntheticPsi } from "./helpers";

beforeEach(async () => { await resetDb(); await auditQueue().obliterate({ force: true }); });
afterAll(async () => { await auditQueue().close(); await prisma.$disconnect(); });

const U = "https://synthetic.invalid/";
let ip = 0;
const req = (path: string, cookie?: string, init: RequestInit = {}) =>
  new Request(`http://t${path}`, { ...init, headers: { "x-forwarded-for": `198.18.0.${++ip % 250}`, "content-type": "application/json", ...(cookie ? { cookie } : {}) } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
async function seed(ownerId: string | null, day: number) {
  const a = await repo.createAudit(U, "MOBILE", ownerId ? hashFor(ownerId) : null);
  await prisma.audit.update({ where: { id: a.id }, data: { createdAt: new Date(Date.UTC(2000, 0, day)) } });
  return repo.saveResult(a.id, parsePsiResponse(syntheticPsi()));
}
const ids = async (r: Response) => ((await r.json()) as { audits: { id: string }[] }).audits.map((a) => a.id);
const A = cookieFor(OWNER_A), B = cookieFor(OWNER_B);

describe("owner isolation (SYNTHETIC owners and data)", () => {
  it("POST issues a signed owner cookie; the creator sees the run in lists, others and anonymous callers do not", async () => {
    const created = await POST(req("/api/audits", undefined, { method: "POST", body: '{"url":"https://8.8.8.8/","strategy":"both"}' }));
    expect(created.status).toBe(202);
    const setCookie = created.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^__Host-va_owner=v1\./);
    expect(setCookie).toMatch(/HttpOnly/); expect(setCookie).toMatch(/Secure/); expect(setCookie).toMatch(/SameSite=Lax/);
    const mine = replayCookie(created);
    const run = ((await created.json()) as { run: { id: string; audits: { id: string }[] } }).run;
    expect((await ids(await LIST(req("/api/audits", mine)))).sort()).toEqual(run.audits.map((a) => a.id).sort());
    expect(await ids(await LIST(req("/api/audits", B)))).toEqual([]);
    expect(await ids(await LIST(req("/api/audits")))).toEqual([]);
    // A second POST with the same cookie keeps the same owner and does not re-issue the cookie.
    const again = await POST(req("/api/audits", mine, { method: "POST", body: '{"url":"https://8.8.8.8/","strategy":"mobile"}' }));
    expect(again.headers.get("set-cookie")).toBeNull();
    expect(await ids(await LIST(req("/api/audits", mine)))).toHaveLength(3);
  });

  it("stores only the owner hash on runs and audits", async () => {
    const created = await POST(req("/api/audits", A, { method: "POST", body: '{"url":"https://8.8.8.8/","strategy":"both"}' }));
    const runId = ((await created.json()) as { run: { id: string } }).run.id;
    const run = await prisma.auditRun.findUnique({ where: { id: runId }, include: { audits: true } });
    expect(run?.ownerHash).toBe(hashFor(OWNER_A));
    expect(run?.audits.every((a) => a.ownerHash === hashFor(OWNER_A))).toBe(true);
    expect(JSON.stringify(run)).not.toContain(OWNER_A);
  });

  it("history excludes other owners' and legacy ownerless audits", async () => {
    const mine = await seed(OWNER_A, 1);
    await seed(OWNER_B, 2);
    await seed(null, 3);
    const q = `/api/history?url=${encodeURIComponent(U)}&strategy=mobile`;
    expect(await ids(await HISTORY(req(q, A)))).toEqual([mine.id]);
    expect(await ids(await HISTORY(req(q)))).toEqual([]);
  });

  it("legacy ownerless audits never appear in anyone's recent list", async () => {
    await seed(null, 1);
    expect(await ids(await LIST(req("/api/audits", A)))).toEqual([]);
  });

  it("compare requires both audits to be the caller's own", async () => {
    const a1 = await seed(OWNER_A, 1), a2 = await seed(OWNER_A, 2), b1 = await seed(OWNER_B, 3);
    expect((await COMPARE(req(`/api/compare?a=${a1.id}&b=${a2.id}`, A))).status).toBe(200);
    expect((await COMPARE(req(`/api/compare?a=${a1.id}&b=${a2.id}`, B))).status).toBe(404);
    expect((await COMPARE(req(`/api/compare?a=${a1.id}&b=${b1.id}`, A))).status).toBe(404);
    expect((await COMPARE(req(`/api/compare?a=${a1.id}&b=${a2.id}`))).status).toBe(404);
  });

  it("budgets are per owner: listing, evaluation and deletion", async () => {
    await seed(OWNER_A, 1);
    const body = JSON.stringify({ url: U, strategy: "mobile", source: "lab", metric: "score", threshold: 50 });
    const created = await POST_BUDGET(req("/api/budgets", A, { method: "POST", body }));
    expect(created.status).toBe(201);
    const budgetId = ((await created.json()) as { budget: { id: string } }).budget.id;
    const list = async (c?: string) => ((await (await BUDGETS(req(`/api/budgets?url=${encodeURIComponent(U)}&strategy=mobile`, c))).json()) as { budgets: { id: string }[]; evaluatedAuditId: string | null });
    expect((await list(A)).budgets.map((b) => b.id)).toEqual([budgetId]);
    expect((await list(B)).budgets).toEqual([]);
    expect((await list(B)).evaluatedAuditId).toBeNull(); // B's "latest audit" never resolves to A's audit
    expect((await DELETE_BUDGET(req(`/api/budgets/${budgetId}`, B, { method: "DELETE" }), ctx(budgetId))).status).toBe(404);
    expect((await DELETE_BUDGET(req(`/api/budgets/${budgetId}`, undefined, { method: "DELETE" }), ctx(budgetId))).status).toBe(404);
    expect((await DELETE_BUDGET(req(`/api/budgets/${budgetId}`, A, { method: "DELETE" }), ctx(budgetId))).status).toBe(204);
  });

  it("tampered cookies are treated as anonymous (no access to the owner's lists)", async () => {
    await seed(OWNER_A, 1);
    const tampered = A.slice(0, -2) + (A.endsWith("AA") ? "BB" : "AA");
    expect(await ids(await LIST(req("/api/audits", tampered)))).toEqual([]);
  });

  it("direct run/audit/report links are share-link capabilities and report viewer ownership", async () => {
    const run = await repo.createRun(U, ["MOBILE"], hashFor(OWNER_A));
    const auditId = run.audits[0]!.id;
    await repo.saveResult(auditId, parsePsiResponse(syntheticPsi()));
    const asA = (await (await GET_RUN(req(`/api/runs/${run.id}`, A), ctx(run.id))).json()) as { viewerIsOwner: boolean };
    const asB = await GET_RUN(req(`/api/runs/${run.id}`, B), ctx(run.id));
    expect(asA.viewerIsOwner).toBe(true);
    expect(asB.status).toBe(200);
    expect(((await asB.json()) as { viewerIsOwner: boolean }).viewerIsOwner).toBe(false);
    expect(((await (await GET_AUDIT(req(`/api/audits/${auditId}`), ctx(auditId))).json()) as { viewerIsOwner: boolean }).viewerIsOwner).toBe(false);
    expect((await REPORT(req(`/api/audits/${auditId}/report?format=md`), ctx(auditId))).status).toBe(200);
  });

  it("new ids are cuid2 (24 chars, not timestamp-prefixed like cuid v1)", async () => {
    const run = await repo.createRun(U, ["MOBILE", "DESKTOP"], hashFor(OWNER_A));
    for (const id of [run.id, ...run.audits.map((a) => a.id)]) expect(id).toMatch(/^[a-z][a-z0-9]{23}$/);
  });
});
