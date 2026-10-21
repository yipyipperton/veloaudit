import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  AUDIT_QUEUE_NAME: z.string().regex(/^[a-z0-9-]+$/).default("audits"),
  /** "queue" (default, production): BullMQ + separate worker. "inline" (demo/serverless): run processAudit via after() in the request's function. */
  AUDIT_EXECUTION_MODE: z.enum(["queue", "inline"]).default("queue"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(2).max(32).default(4),
  AUDIT_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  /** HMAC key for the anonymous owner cookie. Required in production; >= 32 chars. */
  SESSION_SECRET: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)).pipe(z.string().min(32).optional()),
  PSI_API_KEY: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
});

export type Env = z.infer<typeof EnvSchema>;
let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}
