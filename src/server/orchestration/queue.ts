import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "../env";

export type AuditJobData = { auditId: string };
export const queueName = (): string => getEnv().AUDIT_QUEUE_NAME;

export function redisConnection(): IORedis {
  return new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}

const g = globalThis as unknown as { __auditQueue?: Queue<AuditJobData> };
export function auditQueue(): Queue<AuditJobData> {
  if (!g.__auditQueue) {
    // Fail fast in request handlers when Redis is down instead of hanging.
    const conn = new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 3000 });
    conn.on("error", () => { /* surfaced through add() rejection */ });
    g.__auditQueue = new Queue<AuditJobData>(queueName(), { connection: conn });
  }
  return g.__auditQueue;
}
