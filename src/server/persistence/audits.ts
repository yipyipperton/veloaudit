import type { Audit, Prisma, Strategy } from "@prisma/client";
import { prisma } from "./db";
import type { ParsedAudit } from "../psi/parser";

export function createAudit(url: string, strategy: Strategy): Promise<Audit> {
  return prisma.audit.create({ data: { url, strategy } });
}
export function getAudit(id: string): Promise<Audit | null> {
  return prisma.audit.findUnique({ where: { id } });
}
export function listAudits(limit = 25): Promise<Audit[]> {
  return prisma.audit.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
/** Completed audits for one URL + strategy, oldest first (uses the url/strategy/createdAt index). */
export function listHistory(url: string, strategy: Strategy, limit = 100): Promise<Audit[]> {
  return prisma.audit
    .findMany({ where: { url, strategy, status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: limit })
    .then((rows) => rows.reverse());
}
export function markRunning(id: string): Promise<Audit> {
  return prisma.audit.update({ where: { id }, data: { status: "RUNNING", startedAt: new Date() } });
}
export function markFailed(id: string, code: string, message: string): Promise<Audit> {
  return prisma.audit.update({ where: { id }, data: { status: "FAILED", errorCode: code, errorMessage: message.slice(0, 500), completedAt: new Date() } });
}
export function saveResult(id: string, p: ParsedAudit): Promise<Audit> {
  const f = p.field;
  return prisma.audit.update({
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
    },
  });
}
export async function failStale(before: Date): Promise<number> {
  const r = await prisma.audit.updateMany({
    where: { status: { in: ["RUNNING", "QUEUED"] }, createdAt: { lt: before } },
    data: { status: "FAILED", errorCode: "STALE", errorMessage: "Audit did not complete (worker interrupted)", completedAt: new Date() },
  });
  return r.count;
}
