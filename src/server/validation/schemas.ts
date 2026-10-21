import { z } from "zod";

export const StrategySchema = z.enum(["mobile", "desktop"]);
export type StrategyInput = z.infer<typeof StrategySchema>;

export const CreateAuditSchema = z.object({
  url: z.string().min(1).max(2048),
  strategy: StrategySchema,
}).strict();

export const AuditIdSchema = z.string().regex(/^[a-z0-9]{20,40}$/);
