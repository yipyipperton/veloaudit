import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/persistence/db";
import * as repo from "@/server/persistence/audits";
import { parsePsiResponse } from "@/server/psi/parser";
import { SYNTHETIC_PSI_NO_FIELD } from "../fixtures/psi-synthetic";
import { resetDb, syntheticPsi } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

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
    const a = await repo.createAudit("https://c.example/", "MOBILE");
    const b = await repo.createAudit("https://d.example/", "MOBILE");
    const f = await repo.markFailed(a.id, "X", "m".repeat(2000));
    expect(f.errorMessage?.length).toBe(500);
    const list = await repo.listAudits(10);
    expect(list.map((x) => x.id)).toEqual([b.id, a.id]);
  });

  it("failStale only fails old non-terminal audits", async () => {
    const old = await repo.createAudit("https://e.example/", "MOBILE");
    await prisma.audit.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 3_600_000), status: "RUNNING" } });
    const fresh = await repo.createAudit("https://f.example/", "MOBILE");
    expect(await repo.failStale(new Date(Date.now() - 60_000))).toBe(1);
    expect((await repo.getAudit(old.id))?.errorCode).toBe("STALE");
    expect((await repo.getAudit(fresh.id))?.status).toBe("QUEUED");
  });

  it("has the expected indexes", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE tablename = 'Audit'`;
    const names = rows.map((r) => r.indexname);
    expect(names).toEqual(expect.arrayContaining(["Audit_createdAt_idx", "Audit_status_idx", "Audit_url_strategy_createdAt_idx"]));
  });
});
