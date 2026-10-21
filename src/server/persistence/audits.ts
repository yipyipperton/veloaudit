import type { Audit, Prisma, Strategy } from "@prisma/client";
import { prisma } from "./db";
import type { ParsedAudit } from "../psi/parser";

export function createAudit(url: string, strategy: Strategy, ownerHash: string | null = null): Promise<Audit> {
  return prisma.audit.create({ data: { url, strategy, ownerHash } });
}

export type AssetMeta = { kind: string; idx: number; timingMs: number | null };
const ASSET_META = { select: { kind: true, idx: true, timingMs: true }, orderBy: [{ kind: "asc" }, { idx: "asc" }] } satisfies Prisma.Audit$assetsArgs;
export type AuditWithAssets = Audit & { assets: AssetMeta[] };
export type RunWithAudits = { id: string; ownerHash: string | null; url: string; createdAt: Date; audits: AuditWithAssets[] };

/** Create a run and one QUEUED audit per strategy atomically. */
export async function createRun(url: string, strategies: Strategy[], ownerHash: string | null = null): Promise<RunWithAudits> {
  return prisma.auditRun.create({
    data: { url, ownerHash, audits: { create: strategies.map((strategy) => ({ url, strategy, ownerHash })) } },
    include: { audits: { orderBy: { strategy: "asc" }, include: { assets: ASSET_META } } },
  });
}
export function getRun(id: string): Promise<RunWithAudits | null> {
  return prisma.auditRun.findUnique({ where: { id }, include: { audits: { orderBy: { strategy: "asc" }, include: { assets: ASSET_META } } } });
}
export function getAuditWithAssets(id: string): Promise<AuditWithAssets | null> {
  return prisma.audit.findUnique({ where: { id }, include: { assets: ASSET_META } });
}
export function getAsset(auditId: string, kind: string, idx: number): Promise<{ mime: string; data: Uint8Array } | null> {
  return prisma.auditAsset.findUnique({ where: { auditId_kind_idx: { auditId, kind, idx } }, select: { mime: true, data: true } });
}
export function getAudit(id: string): Promise<Audit | null> {
  return prisma.audit.findUnique({ where: { id } });
}
/** The caller's recent audits only. Ownerless (legacy) rows never match. */
export function listAudits(ownerHash: string, limit = 25): Promise<Audit[]> {
  return prisma.audit.findMany({ where: { ownerHash }, orderBy: { createdAt: "desc" }, take: limit });
}
/** Completed audits for one URL + strategy, oldest first (uses the url/strategy/createdAt index). */
export function listHistory(url: string, strategy: Strategy, ownerHash: string, limit = 100): Promise<Audit[]> {
  return prisma.audit
    .findMany({ where: { ownerHash, url, strategy, status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: limit })
    .then((rows) => rows.reverse());
}
export function markRunning(id: string): Promise<Audit> {
  return prisma.audit.update({ where: { id }, data: { status: "RUNNING", startedAt: new Date() } });
}
export function markFailed(id: string, code: string, message: string): Promise<Audit> {
  return prisma.audit.update({ where: { id }, data: { status: "FAILED", errorCode: code, errorMessage: message.slice(0, 500), completedAt: new Date() } });
}
/** Persist metrics, findings and screenshot assets in one transaction. */
export async function saveResult(id: string, p: ParsedAudit): Promise<Audit> {
  const f = p.field;
  const assets: Prisma.AuditAssetCreateManyInput[] = [
    ...(p.screenshots.final ? [{ auditId: id, kind: "final", idx: 0, mime: p.screenshots.final.mime, timingMs: null, data: new Uint8Array(p.screenshots.final.data) }] : []),
    ...p.screenshots.thumbnails.map((t, idx) => ({ auditId: id, kind: "thumb", idx, mime: t.mime, timingMs: t.timingMs, data: new Uint8Array(t.data) })),
  ];
  const [, updated] = await prisma.$transaction([
    prisma.auditAsset.deleteMany({ where: { auditId: id } }),
    prisma.audit.update({
    where: { id },
    data: {
      status: "SUCCEEDED", completedAt: new Date(), errorCode: null, errorMessage: null,
      finalUrl: p.finalUrl, lighthouseVersion: p.lighthouseVersion, fetchTime: p.fetchTime,
      labScore: p.lab.score, labLcpMs: p.lab.lcpMs, labFcpMs: p.lab.fcpMs, labSpeedIndexMs: p.lab.speedIndexMs,
      labTbtMs: p.lab.tbtMs, labCls: p.lab.cls, labTtfbMs: p.lab.ttfbMs,
      fieldScope: f.scope, fieldOverall: f.overall,
      fieldLcpMs: f.lcpMs?.value ?? null, fieldLcpCategory: f.lcpMs?.category ?? null,
      fieldInpMs: f.inpMs?.value ?? null, fieldInpCategory: f.inpMs?.category ?? null,
      fieldCls: f.cls?.value ?? null, fieldClsCategory: f.cls?.category ?? null,
      fieldFcpMs: f.fcpMs?.value ?? null, fieldFcpCategory: f.fcpMs?.category ?? null,
      fieldTtfbMs: f.ttfbMs?.value ?? null, fieldTtfbCategory: f.ttfbMs?.category ?? null,
      opportunities: p.opportunities as unknown as Prisma.InputJsonValue,
      diagnostics: p.diagnostics as unknown as Prisma.InputJsonValue,
      labMetricScores: p.labMetricScores as unknown as Prisma.InputJsonValue,
      fieldDistributions: p.fieldDistributions as unknown as Prisma.InputJsonValue,
    },
  }),
    prisma.auditAsset.createMany({ data: assets }),
  ]);
  return updated;
}
export async function failStale(before: Date): Promise<number> {
  const r = await prisma.audit.updateMany({
    where: { status: { in: ["RUNNING", "QUEUED"] }, createdAt: { lt: before } },
    data: { status: "FAILED", errorCode: "STALE", errorMessage: "Audit did not complete (worker interrupted)", completedAt: new Date() },
  });
  return r.count;
}
