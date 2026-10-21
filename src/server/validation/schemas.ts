import { z } from "zod";

export const StrategySchema = z.enum(["mobile", "desktop"]);
export type StrategyInput = z.infer<typeof StrategySchema>;

/** "both" (default in the UI) runs mobile and desktop in parallel as one linked run. */
export const CreateAuditSchema = z.object({
  url: z.string().min(1).max(2048),
  strategy: z.enum(["mobile", "desktop", "both"]),
}).strict();
export const RunIdSchema = z.string().regex(/^[a-z0-9]{20,40}$/);
export const AssetQuerySchema = z.object({ kind: z.enum(["final", "thumb"]), i: z.coerce.number().int().min(0).max(31) });

export const AuditIdSchema = z.string().regex(/^[a-z0-9]{20,40}$/);
