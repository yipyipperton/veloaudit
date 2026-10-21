import type { Audit } from "@prisma/client";
import { createAudit, getAudit, markFailed, markRunning, saveResult } from "../persistence/audits";
import { auditQueue } from "./queue";
import { runPagespeed, PsiError } from "../psi/client";
import { parsePsiResponse, PsiParseError } from "../psi/parser";
import { getEnv } from "../env";
import { logger } from "../logger";
import type { StrategyInput } from "../validation/schemas";

/** API side: persist a QUEUED audit and enqueue it. Never runs PSI in the request lifetime. */
export async function enqueueAudit(url: string, strategy: StrategyInput): Promise<Audit> {
  const audit = await createAudit(url, strategy === "mobile" ? "MOBILE" : "DESKTOP");
  try {
    await auditQueue().add("run", { auditId: audit.id }, { jobId: audit.id, attempts: 1, removeOnComplete: 1000, removeOnFail: 1000 });
  } catch (err) {
    await markFailed(audit.id, "QUEUE_UNAVAILABLE", "Could not enqueue audit job");
    throw err;
  }
  logger.info("audit.enqueued", { auditId: audit.id, url, strategy });
  return audit;
}

/** Worker side: execute one audit end-to-end. */
export async function processAudit(auditId: string): Promise<void> {
  const audit = await getAudit(auditId);
  if (!audit) { logger.warn("audit.missing", { auditId }); return; }
  if (audit.status === "SUCCEEDED") return;
  await markRunning(auditId);
  const strategy = audit.strategy === "MOBILE" ? "mobile" : "desktop";
  try {
    const json = await runPagespeed(audit.url, strategy, { apiKey: getEnv().PSI_API_KEY });
    const parsed = parsePsiResponse(json);
    await saveResult(auditId, parsed);
    logger.info("audit.succeeded", { auditId, score: parsed.lab.score, fieldScope: parsed.field.scope });
  } catch (err) {
    const code = err instanceof PsiError ? err.code : err instanceof PsiParseError ? "PSI_PARSE" : "INTERNAL";
    const message = err instanceof PsiError || err instanceof PsiParseError ? err.message : "Unexpected worker error";
    await markFailed(auditId, code, message);
    logger.error("audit.failed", { auditId, code, message });
  }
}
