import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Worker } from "bullmq";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import { enqueueAudit, processAudit, type ProcessDeps } from "@/server/orchestration/audits";
import { auditQueue, queueName, redisConnection, type AuditJobData } from "@/server/orchestration/queue";
import { runPagespeed } from "@/server/psi/client";
import { resetDb, syntheticPsi } from "./helpers";

beforeEach(async () => { await resetDb(); await auditQueue().obliterate({ force: true }); });
afterAll(async () => { await auditQueue().close(); await prisma.$disconnect(); });

const noSleep = async () => {};
/** Fake fetch that returns the given HTTP statuses in order, then a SYNTHETIC PSI body. */
function scriptedFetch(statuses: number[]): { fetchImpl: typeof fetch; calls: () => number } {
  let n = 0;
  const fetchImpl = (async () => {
    const s = statuses[n++];
    return s ? new Response('{"error":{"message":"transient"}}', { status: s }) : new Response(JSON.stringify(syntheticPsi()), { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, calls: () => n };
}
const deps = (fetchImpl: typeof fetch, jobTimeoutMs = 5000): ProcessDeps => ({
  runPsi: (url, strategy, signal) => runPagespeed(url, strategy, { fetchImpl, sleep: noSleep, signal, maxAttempts: 4 }),
  jobTimeoutMs,
});
const hang = ((_u: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_, rej) => init?.signal?.addEventListener("abort", () => rej(init.signal?.reason)))) as typeof fetch;

describe("job lifecycle (real Postgres, fake PSI transport, SYNTHETIC payload)", () => {
  it("QUEUED -> RUNNING -> SUCCEEDED after transient 429/503 retries", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    const f = scriptedFetch([429, 503]);
    const done = await processAudit(a.id, deps(f.fetchImpl));
    expect(f.calls()).toBe(3);
    expect(done?.status).toBe("SUCCEEDED");
    expect(done?.labScore).toBe(73);
  });
  it("FAILED with PSI_UPSTREAM after exhausting retries", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    const f = scriptedFetch([500, 500, 500, 500, 500]);
    const done = await processAudit(a.id, deps(f.fetchImpl));
    expect(f.calls()).toBe(4);
    expect(done?.errorCode).toBe("PSI_UPSTREAM");
  });
  it("FAILED fast on non-retryable 400", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    const f = scriptedFetch([400]);
    expect((await processAudit(a.id, deps(f.fetchImpl)))?.errorCode).toBe("PSI_BAD_REQUEST");
    expect(f.calls()).toBe(1);
  });
  it("per-attempt timeout is retried, then fails with PSI_TIMEOUT", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    let n = 0;
    const counting = ((u: RequestInfo | URL, init?: RequestInit) => { n++; return hang(u, init); }) as typeof fetch;
    const done = await processAudit(a.id, {
      runPsi: (url, s, signal) => runPagespeed(url, s, { fetchImpl: counting, sleep: noSleep, signal, timeoutMs: 50, maxAttempts: 3 }),
      jobTimeoutMs: 5000,
    });
    expect(n).toBe(3);
    expect(done?.errorCode).toBe("PSI_TIMEOUT");
  });
  it("job deadline aborts a hung PSI call -> JOB_TIMEOUT", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    const t0 = Date.now();
    const done = await processAudit(a.id, deps(hang, 150));
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(done?.errorCode).toBe("JOB_TIMEOUT");
  });
  it("malformed PSI payload -> FAILED PSI_PARSE", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    expect((await processAudit(a.id, { runPsi: async () => ({ junk: true }), jobTimeoutMs: 1000 }))?.errorCode).toBe("PSI_PARSE");
  });
  it("does not reprocess terminal audits", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    await repo.markFailed(a.id, "X", "y");
    let called = false;
    await processAudit(a.id, { runPsi: async () => { called = true; return syntheticPsi(); }, jobTimeoutMs: 1000 });
    expect(called).toBe(false);
  });
  it("end-to-end through real Redis/BullMQ: enqueue -> worker -> SUCCEEDED", async () => {
    const f = scriptedFetch([503]);
    const worker = new Worker<AuditJobData>(queueName(), async (job) => { await processAudit(job.data.auditId, deps(f.fetchImpl)); }, { connection: redisConnection() });
    try {
      const a = await enqueueAudit("https://a.example/", "desktop");
      let status = "QUEUED";
      for (let i = 0; i < 50 && status !== "SUCCEEDED" && status !== "FAILED"; i++) {
        await new Promise((r) => setTimeout(r, 100));
        status = (await repo.getAudit(a.id))?.status ?? "missing";
      }
      expect(status).toBe("SUCCEEDED");
    } finally {
      await worker.close();
    }
  });
});
