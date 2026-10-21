import type { Audit } from "@prisma/client";
import * as repo from "../persistence/audits";
import { auditQueue } from "./queue";
import { runPagespeed, PsiError, type PsiStrategy } from "../psi/client";
import { parsePsiResponse, PsiParseError } from "../psi/parser";
import { getEnv } from "../env";
import { logger } from "../logger";
import type { StrategyInput } from "../validation/schemas";

export class QueueUnavailableError extends Error {}

/** API side: persist a QUEUED audit and enqueue it. Never runs PSI in the request lifetime. */
export async function enqueueAudit(url: string, strategy: StrategyInput): Promise<Audit> {
  const audit = await repo.createAudit(url, strategy === "mobile" ? "MOBILE" : "DESKTOP");
  try {
    await auditQueue().add("run", { auditId: audit.id }, { jobId: audit.id, attempts: 1, removeOnComplete: 1000, removeOnFail: 1000 });
  } catch (err) {
    logger.error("audit.enqueue_failed", { auditId: audit.id, err: err instanceof Error ? err.message : "unknown" });
    await repo.markFailed(audit.id, "QUEUE_UNAVAILABLE", "Could not enqueue audit job");
    throw new QueueUnavailableError("queue unavailable");
  }
  logger.info("audit.enqueued", { auditId: audit.id, url, strategy });
  return audit;
}

export type PsiRunner = (url: string, strategy: PsiStrategy, signal: AbortSignal) => Promise<unknown>;
export type ProcessDeps = { runPsi: PsiRunner; jobTimeoutMs: number };

export function defaultDeps(): ProcessDeps {
  const env = getEnv();
  return {
    runPsi: (url, strategy, signal) => runPagespeed(url, strategy, { apiKey: env.PSI_API_KEY, signal }),
    jobTimeoutMs: env.AUDIT_JOB_TIMEOUT_MS,
  };
}

function withDeadline<T>(p: Promise<T>, ms: number, ctl: AbortController): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => { ctl.abort(); rej(new PsiError(`Audit exceeded ${ms}ms job deadline`, "JOB_TIMEOUT", null, false)); }, ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/** Worker side: execute one audit end-to-end. Always leaves the row in a terminal state. */
export async function processAudit(auditId: string, deps: ProcessDeps = defaultDeps()): Promise<Audit | null> {
  const audit = await repo.getAudit(auditId);
  if (!audit) { logger.warn("audit.missing", { auditId }); return null; }
  if (audit.status === "SUCCEEDED" || audit.status === "FAILED") return audit;
  await repo.markRunning(auditId);
  const strategy: PsiStrategy = audit.strategy === "MOBILE" ? "mobile" : "desktop";
  const ctl = new AbortController();
  try {
    const json = await withDeadline(deps.runPsi(audit.url, strategy, ctl.signal), deps.jobTimeoutMs, ctl);
    const parsed = parsePsiResponse(json);
    const saved = await repo.saveResult(auditId, parsed);
    logger.info("audit.succeeded", { auditId, score: parsed.lab.score, fieldScope: parsed.field.scope });
    return saved;
  } catch (err) {
    const code = err instanceof PsiError ? err.code : err instanceof PsiParseError ? "PSI_PARSE" : "INTERNAL";
    const message = err instanceof PsiError || err instanceof PsiParseError ? err.message : "Unexpected worker error";
    logger.error("audit.failed", { auditId, code, message, err: err instanceof Error ? err.message : "unknown" });
    return repo.markFailed(auditId, code, message);
  }
}

/** Recover rows stuck in RUNNING/QUEUED (e.g. worker crash) older than `olderThanMs`. */
export async function failStaleAudits(olderThanMs: number): Promise<number> {
  return repo.failStale(new Date(Date.now() - olderThanMs));
}
