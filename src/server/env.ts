import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  PSI_API_KEY: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
});

export type Env = z.infer<typeof EnvSchema>;
let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}
