import { Worker } from "bullmq";
import { queueName, redisConnection, type AuditJobData } from "../server/orchestration/queue";
import { failStaleAudits, processAudit } from "../server/orchestration/audits";
import { prisma } from "../server/persistence/db";
import { logger } from "../server/logger";
import { getEnv } from "../server/env";

const env = getEnv();
const worker = new Worker<AuditJobData>(queueName(), async (job) => { await processAudit(job.data.auditId); }, {
  connection: redisConnection(),
  concurrency: 2,
  lockDuration: env.AUDIT_JOB_TIMEOUT_MS + 60_000,
});
worker.on("ready", () => logger.info("worker.ready", { queue: queueName(), keyed: Boolean(env.PSI_API_KEY) }));
worker.on("failed", (job, err) => logger.error("worker.job_failed", { jobId: job?.id ?? null, err: err.message }));
worker.on("error", (err) => logger.error("worker.error", { err: err.message }));

void failStaleAudits(env.AUDIT_JOB_TIMEOUT_MS * 2)
  .then((n) => { if (n > 0) logger.warn("worker.stale_recovered", { count: n }); })
  .catch((e: unknown) => logger.error("worker.stale_recovery_failed", { err: e instanceof Error ? e.message : "unknown" }));

async function shutdown(sig: string) {
  logger.info("worker.shutdown", { sig });
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (r) => logger.error("worker.unhandled_rejection", { err: r instanceof Error ? r.message : String(r) }));
