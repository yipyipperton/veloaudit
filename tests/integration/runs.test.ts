import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/audits/route";
import { GET as GET_RUN } from "@/app/api/runs/[id]/route";
import { GET as GET_AUDIT } from "@/app/api/audits/[id]/route";
import { GET as GET_SHOT } from "@/app/api/audits/[id]/screenshot/route";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import { enqueueRun, processAudit, type ProcessDeps } from "@/server/orchestration/audits";
import { auditQueue } from "@/server/orchestration/queue";
import type { AuditView, RunView } from "@/lib/types";
import { resetDb, syntheticPsi } from "./helpers";

beforeEach(async () => { await resetDb(); await auditQueue().obliterate({ force: true }); });
afterAll(async () => { await auditQueue().close(); await prisma.$disconnect(); });

/** Fake PSI runner that records peak concurrency; resolves with the SYNTHETIC payload after `ms`. */
function concurrencyProbe(ms = 60): { deps: ProcessDeps; peak: () => number; strategies: string[] } {
  let active = 0, peak = 0;
  const strategies: string[] = [];
  return {
    strategies, peak: () => peak,
    deps: { jobTimeoutMs: 5000, runPsi: async (_u, s) => { strategies.push(s); active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, ms)); active--; return syntheticPsi(); } },
  };
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("linked mobile + desktop runs", () => {
  it("inline mode runs both devices in parallel within one scheduled task", async () => {
    const probe = concurrencyProbe();
    const tasks: (() => Promise<void>)[] = [];
    const run = await enqueueRun("https://a.example/", "both", { mode: "inline", schedule: (t) => tasks.push(t), deps: probe.deps });
    expect(run.audits.map((a) => a.strategy)).toEqual(["MOBILE", "DESKTOP"]);
    expect(run.audits.every((a) => a.runId === run.id && a.status === "QUEUED")).toBe(true);
    expect(tasks).toHaveLength(1);
    await tasks[0]!();
    expect(probe.peak()).toBe(2);
    expect(probe.strategies.sort()).toEqual(["desktop", "mobile"]);
    const done = await repo.getRun(run.id);
    expect(done?.audits.map((a) => a.status)).toEqual(["SUCCEEDED", "SUCCEEDED"]);
  });

  it("queue mode enqueues one job per device (jobId = auditId) for parallel workers", async () => {
    const run = await enqueueRun("https://a.example/", "both", { mode: "queue" });
    const jobs = await Promise.all(run.audits.map((a) => auditQueue().getJob(a.id)));
    expect(jobs.map((j) => j?.data.auditId)).toEqual(run.audits.map((a) => a.id));
  });

  it("one device failing leaves the other intact (PARTIAL run)", async () => {
    const tasks: (() => Promise<void>)[] = [];
    const deps: ProcessDeps = { jobTimeoutMs: 5000, runPsi: async (_u, s) => (s === "mobile" ? syntheticPsi() : { junk: true }) };
    const run = await enqueueRun("https://a.example/", "both", { mode: "inline", schedule: (t) => tasks.push(t), deps });
    await tasks[0]!();
    const r = await GET_RUN(new Request(`http://t/api/runs/${run.id}`), ctx(run.id));
    const body = (await r.json()) as { run: RunView };
    expect(body.run.status).toBe("PARTIAL");
    expect(body.run.audits.map((a) => [a.strategy, a.status, a.error?.code ?? null])).toEqual([["mobile", "SUCCEEDED", null], ["desktop", "FAILED", "PSI_PARSE"]]);
  });

  it("single-strategy runs are still supported", async () => {
    const run = await enqueueRun("https://a.example/", "desktop", { mode: "queue" });
    expect(run.audits.map((a) => a.strategy)).toEqual(["DESKTOP"]);
  });
});

describe("runs + screenshot API", () => {
  it("POST strategy=both returns 202 with a run of two QUEUED audits", async () => {
    const r = await POST(new Request("http://t/api/audits", { method: "POST", body: '{"url":"https://8.8.8.8/","strategy":"both"}', headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.200" } }));
    expect(r.status).toBe(202);
    const j = (await r.json()) as { run: RunView; audit: AuditView };
    expect(j.run.audits.map((a) => [a.strategy, a.status])).toEqual([["mobile", "QUEUED"], ["desktop", "QUEUED"]]);
    expect(j.run.status).toBe("QUEUED");
    expect(j.audit.id).toBe(j.run.audits[0]!.id);
  });

  it("GET /api/runs/[id] validates ids and 404s unknown runs", async () => {
    expect((await GET_RUN(new Request("http://t"), ctx("../etc"))).status).toBe(400);
    expect((await GET_RUN(new Request("http://t"), ctx("cnotarealrunidxxxxxxxxxxx"))).status).toBe(404);
  });

  it("stores screenshots as assets, exposes URLs in the DTO and serves bytes with safe headers", async () => {
    const run = await repo.createRun("https://a.example/", ["MOBILE"]);
    const id = run.audits[0]!.id;
    await processAudit(id, { jobTimeoutMs: 5000, runPsi: async () => syntheticPsi() });
    const dto = ((await (await GET_AUDIT(new Request("http://t"), ctx(id))).json()) as { audit: AuditView }).audit;
    expect(dto.screenshots.final?.src).toBe(`/api/audits/${id}/screenshot?kind=final&i=0`);
    expect(dto.screenshots.thumbnails.map((t) => t.timingMs)).toEqual([300, 900]);
    expect(dto.fieldDistributions.lcp).toEqual([0.7, 0.2, 0.1]);
    expect(dto.diagnostics.map((d) => d.id)).toEqual(["dom-size"]);

    const res = await GET_SHOT(new Request(`http://t${dto.screenshots.final!.src}`), ctx(id));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await res.arrayBuffer()).subarray(1, 4)).toEqual(new Uint8Array([0x50, 0x4e, 0x47]));
    expect((await GET_SHOT(new Request(`http://t/x?kind=thumb&i=9`), ctx(id))).status).toBe(404);
    expect((await GET_SHOT(new Request(`http://t/x?kind=evil&i=0`), ctx(id))).status).toBe(400);

    // Re-saving replaces assets instead of duplicating them.
    await prisma.audit.update({ where: { id }, data: { status: "QUEUED" } });
    await processAudit(id, { jobTimeoutMs: 5000, runPsi: async () => syntheticPsi() });
    expect(await prisma.auditAsset.count({ where: { auditId: id } })).toBe(3);
  });
});
