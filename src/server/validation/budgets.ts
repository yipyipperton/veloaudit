import { z } from "zod";
import { findMetric } from "@/lib/metrics";
import { StrategySchema } from "./schemas";
import { checkUrlSyntax } from "./url";

export const NormalizedUrlSchema = z.string().min(1).max(2048).transform((v, ctx) => {
  const r = checkUrlSyntax(v);
  if (!r.ok) { ctx.addIssue({ code: "custom", message: r.reason }); return z.NEVER; }
  return r.url;
});

export const CreateBudgetSchema = z.object({
  url: NormalizedUrlSchema,
  strategy: StrategySchema,
  source: z.enum(["lab", "field"]),
  metric: z.string().min(1).max(16),
  threshold: z.number().finite().nonnegative(),
}).strict().superRefine((b, ctx) => {
  const def = findMetric(b.source, b.metric);
  if (!def) { ctx.addIssue({ code: "custom", path: ["metric"], message: `"${b.metric}" is not a ${b.source} metric` }); return; }
  if (def.unit === "score" && b.threshold > 100) ctx.addIssue({ code: "custom", path: ["threshold"], message: "Score threshold must be 0-100" });
  if (def.unit === "unitless" && b.threshold > 10) ctx.addIssue({ code: "custom", path: ["threshold"], message: "CLS threshold must be 0-10" });
  if (def.unit === "ms" && b.threshold > 600_000) ctx.addIssue({ code: "custom", path: ["threshold"], message: "Threshold too large" });
});
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;

export const HistoryQuerySchema = z.object({ url: NormalizedUrlSchema, strategy: StrategySchema });
