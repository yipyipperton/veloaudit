import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GET as GET_AUDIT } from "@/app/api/audits/[id]/route";
import { GET as BUDGETS, POST as POST_BUDGET } from "@/app/api/budgets/route";
import { GET as COMPARE } from "@/app/api/compare/route";
import { GET as HISTORY } from "@/app/api/history/route";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import { processAudit } from "@/server/orchestration/audits";
import type { AuditView } from "@/lib/types";
import { OWNER_A, cookieFor, hashFor, resetDb } from "./helpers";

/** REAL-response-derived fixture (web.dev mobile, all four categories). See tests/fixtures/README.md. */
const REAL = JSON.parse(readFileSync(join(__dirname, "../fixtures/psi-real-webdev-mobile-categories-excerpt.json"), "utf8")) as unknown;
const U = "https://web.dev/";
const A = cookieFor(OWNER_A);
const req = (p: string, init: RequestInit = {}) => new Request(`http://t${p}`, { ...init, headers: { cookie: A, "content-type": "application/json", "x-forwarded-for": "198.51.100.9" } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function audit(day: number, tweak?: (j: { lighthouseResult: { categories: Record<string, { score: number }> } }) => void) {
  const a = await repo.createAudit(U, "MOBILE", hashFor(OWNER_A));
  await prisma.audit.update({ where: { id: a.id }, data: { createdAt: new Date(Date.UTC(2000, 0, day)) } });
  const payload = structuredClone(REAL) as { lighthouseResult: { categories: Record<string, { score: number }> } };
  tweak?.(payload);
  await processAudit(a.id, { jobTimeoutMs: 5000, runPsi: async () => payload });
  return a.id;
}

describe("Lighthouse categories end to end (real-derived fixture)", () => {
  it("persists category scores and grouped audits and returns them in the DTO", async () => {
    const id = await audit(1);
    const row = await repo.getAudit(id);
    expect([row?.labScore, row?.accessibilityScore, row?.bestPracticesScore, row?.seoScore]).toEqual([57, 90, 96, 92]);
    const dto = ((await (await GET_AUDIT(req(`/api/audits/${id}`), ctx(id))).json()) as { audit: AuditView }).audit;
    expect(dto.categoryScores).toEqual({ performance: 57, accessibility: 90, bestPractices: 96, seo: 92 });
    expect(dto.categories.find((c) => c.id === "accessibility")?.failed.map((f) => f.id)).toEqual(["color-contrast", "frame-title", "link-name"]);
  });

  it("category-score budgets evaluate against the stored score", async () => {
    await audit(1);
    for (const [metric, threshold] of [["accessibility", 95], ["seo", 90]] as const)
      expect((await POST_BUDGET(req("/api/budgets", { method: "POST", body: JSON.stringify({ url: U, strategy: "mobile", source: "lab", metric, threshold }) }))).status).toBe(201);
    const j = (await (await BUDGETS(req(`/api/budgets?url=${encodeURIComponent(U)}&strategy=mobile`))).json()) as { results: { metric: string; status: string; actual: number | null }[] };
    expect(j.results.map((r) => [r.metric, r.status, r.actual])).toEqual([["accessibility", "fail", 90], ["seo", "pass", 92]]);
  });

  it("history and compare include category scores", async () => {
    const a = await audit(1);
    const b = await audit(2, (j) => { j.lighthouseResult.categories["accessibility"]!.score = 0.98; });
    const h = (await (await HISTORY(req(`/api/history?url=${encodeURIComponent(U)}&strategy=mobile`))).json()) as { audits: AuditView[] };
    expect(h.audits.map((x) => x.categoryScores.accessibility)).toEqual([90, 98]);
    const c = (await (await COMPARE(req(`/api/compare?a=${a}&b=${b}`))).json()) as { deltas: { def: { key: string }; delta: number | null; verdict: string }[] };
    const d = c.deltas.find((x) => x.def.key === "accessibility");
    expect([d?.delta, d?.verdict]).toEqual([8, "improved"]);
    expect(c.deltas.find((x) => x.def.key === "seo")?.verdict).toBe("unchanged");
  });
});
