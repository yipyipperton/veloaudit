import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "../env";

export const AUDIT_QUEUE = "audits";
export type AuditJobData = { auditId: string };

export function redisConnection(): IORedis {
  return new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}

const g = globalThis as unknown as { __auditQueue?: Queue<AuditJobData> };
export function auditQueue(): Queue<AuditJobData> {
  g.__auditQueue ??= new Queue<AuditJobData>(AUDIT_QUEUE, { connection: redisConnection() });
  return g.__auditQueue;
}
