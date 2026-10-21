import { Worker } from "bullmq";
import { AUDIT_QUEUE, redisConnection, type AuditJobData } from "../server/orchestration/queue";
import { processAudit } from "../server/orchestration/audits";
import { prisma } from "../server/persistence/db";
import { logger } from "../server/logger";

const worker = new Worker<AuditJobData>(AUDIT_QUEUE, async (job) => processAudit(job.data.auditId), {
  connection: redisConnection(),
  concurrency: 2,
  lockDuration: 10 * 60_000,
});
worker.on("ready", () => logger.info("worker.ready", { queue: AUDIT_QUEUE }));
worker.on("failed", (job, err) => logger.error("worker.job_failed", { jobId: job?.id ?? null, err: err.message }));

async function shutdown(sig: string) {
  logger.info("worker.shutdown", { sig });
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
