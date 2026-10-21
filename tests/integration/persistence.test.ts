import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import * as budgets from "@/server/persistence/budgets";
import { parsePsiResponse } from "@/server/psi/parser";
import { SYNTHETIC_PSI_NO_FIELD } from "../fixtures/psi-synthetic";
import { resetDb, syntheticPsi } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** SYNTHETIC owner hashes for isolation tests. */
const OWNER = "a".repeat(64), OTHER = "b".repeat(64);

describe("audit persistence (real Postgres, SYNTHETIC payloads)", () => {
  it("creates a QUEUED audit with null metrics", async () => {
    const a = await repo.createAudit("https://a.example/", "MOBILE");
    expect(a.status).toBe("QUEUED");
    expect(a.labScore).toBeNull();
    expect(a.fieldInpMs).toBeNull();
  });
  it("round-trips lab, field, and opportunities", async () => {
    const a = await repo.createAudit("https://a.example/", "DESKTOP");
    await repo.markRunning(a.id);
    await repo.saveResult(a.id, parsePsiResponse(syntheticPsi()));
    const got = await repo.getAudit(a.id);
    expect(got?.status).toBe("SUCCEEDED");
    expect(got?.labScore).toBe(73);
    expect(got?.fieldInpMs).toBe(180);
    expect(got?.fieldCls).toBeCloseTo(0.05);
    expect(Array.isArray(got?.opportunities)).toBe(true);
    expect(got?.startedAt).not.toBeNull();
    expect(got?.completedAt).not.toBeNull();
  });
  it("stores missing field data as NULL (never derived from lab TBT)", async () => {
    const a = await repo.createAudit("https://b.example/", "MOBILE");
    await repo.saveResult(a.id, parsePsiResponse(SYNTHETIC_PSI_NO_FIELD));
    const got = await repo.getAudit(a.id);
    expect(got?.labTbtMs).toBe(250);
    expect(got?.fieldInpMs).toBeNull();
    expect(got?.fieldScope).toBeNull();
  });
  it("markFailed truncates long messages and lists newest first", async () => {
    const a = await repo.createAudit("https://c.example/", "MOBILE", OWNER);
    const b = await repo.createAudit("https://d.example/", "MOBILE", OWNER);
    await repo.createAudit("https://other.example/", "MOBILE", OTHER);
    await repo.createAudit("https://legacy.example/", "MOBILE"); // ownerless legacy row
    expect((await repo.markFailed(a.id, "X", "m".repeat(2000))).errorMessage?.length).toBe(500);
    expect((await repo.listAudits(OWNER, 10)).map((x) => x.id)).toEqual([b.id, a.id]);
  });
  it("failStale only fails old non-terminal audits", async () => {
    const old = await repo.createAudit("https://e.example/", "MOBILE");
    await prisma.audit.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 3_600_000), status: "RUNNING" } });
    const fresh = await repo.createAudit("https://f.example/", "MOBILE");
    expect(await repo.failStale(new Date(Date.now() - 60_000))).toBe(1);
    expect((await repo.getAudit(old.id))?.errorCode).toBe("STALE");
    expect((await repo.getAudit(fresh.id))?.status).toBe("QUEUED");
  });
  it("listHistory returns only SUCCEEDED audits for url+strategy, oldest first", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const a = await repo.createAudit("https://h.example/", "MOBILE", OWNER);
      await prisma.audit.update({ where: { id: a.id }, data: { createdAt: new Date(Date.UTC(2000, 0, i + 1)) } });
      await repo.saveResult(a.id, parsePsiResponse(syntheticPsi()));
      ids.push(a.id);
    }
    await repo.createAudit("https://h.example/", "MOBILE", OWNER); // queued, excluded
    await repo.saveResult((await repo.createAudit("https://h.example/", "DESKTOP", OWNER)).id, parsePsiResponse(syntheticPsi()));
    await repo.saveResult((await repo.createAudit("https://h.example/", "MOBILE", OTHER)).id, parsePsiResponse(syntheticPsi())); // other owner
    await repo.saveResult((await repo.createAudit("https://h.example/", "MOBILE")).id, parsePsiResponse(syntheticPsi())); // legacy ownerless
    expect((await repo.listHistory("https://h.example/", "MOBILE", OWNER)).map((a) => a.id)).toEqual(ids);
    expect((await repo.listHistory("https://h.example/", "MOBILE", OWNER, 2)).map((a) => a.id)).toEqual(ids.slice(1));
  });
  it("has the expected indexes", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE tablename IN ('Audit','Budget')`;
    expect(rows.map((r) => r.indexname)).toEqual(expect.arrayContaining([
      "Audit_createdAt_idx", "Audit_status_idx", "Audit_url_strategy_createdAt_idx", "Audit_ownerHash_createdAt_idx",
      "Audit_ownerHash_url_strategy_createdAt_idx", "Budget_ownerHash_url_strategy_idx", "Budget_ownerHash_url_strategy_source_metric_key"]));
  });
});

describe("budget persistence", () => {
  it("upserts one target per url/strategy/source/metric and deletes", async () => {
    const input = { ownerHash: OWNER, url: "https://b.example/", strategy: "MOBILE" as const, source: "FIELD" as const, metric: "inp", threshold: 200 };
    const b1 = await budgets.upsertBudget(input);
    const b2 = await budgets.upsertBudget({ ...input, threshold: 150 });
    expect(b2.id).toBe(b1.id);
    expect(b2.threshold).toBe(150);
    await budgets.upsertBudget({ ...input, source: "LAB", metric: "lcp", threshold: 2500 });
    await budgets.upsertBudget({ ...input, ownerHash: OTHER, threshold: 999 }); // same key, other owner: separate row
    expect(await budgets.listBudgets(OWNER, "https://b.example/", "MOBILE")).toHaveLength(2);
    expect(await budgets.listBudgets(OWNER, "https://b.example/", "DESKTOP")).toHaveLength(0);
    expect((await budgets.listBudgets(OTHER, "https://b.example/", "MOBILE")).map((b) => b.threshold)).toEqual([999]);
    expect(await budgets.deleteBudget(b1.id, OTHER)).toBe(false); // cannot delete someone else's
    expect(await budgets.deleteBudget(b1.id, OWNER)).toBe(true);
    expect(await budgets.deleteBudget(b1.id, OWNER)).toBe(false);
  });
});
