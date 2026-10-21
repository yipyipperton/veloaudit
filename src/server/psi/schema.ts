import { z } from "zod";

/** Minimal, permissive schema of the PSI v5 runPagespeed response (only fields we read). */
const AuditSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  score: z.number().nullable().optional(),
  scoreDisplayMode: z.string().optional(),
  numericValue: z.number().optional(),
  displayValue: z.string().optional(),
  metricSavings: z.record(z.string(), z.number()).optional(),
  details: z.object({
    type: z.string().optional(),
    overallSavingsMs: z.number().optional(),
    overallSavingsBytes: z.number().optional(),
  }).passthrough().optional(),
}).passthrough();
export type LhAudit = z.infer<typeof AuditSchema>;

const CruxMetricSchema = z.object({
  percentile: z.number(),
  category: z.string().optional(),
  distributions: z.array(z.object({ min: z.number(), max: z.number().optional(), proportion: z.number() }).passthrough()).optional(),
}).passthrough();

export const LoadingExperienceSchema = z.object({
  id: z.string().optional(),
  origin_fallback: z.boolean().optional(),
  overall_category: z.string().optional(),
  metrics: z.record(z.string(), CruxMetricSchema).optional(),
}).passthrough();

export const PsiResponseSchema = z.object({
  id: z.string().optional(),
  loadingExperience: LoadingExperienceSchema.optional(),
  originLoadingExperience: LoadingExperienceSchema.optional(),
  lighthouseResult: z.object({
    finalUrl: z.string().optional(),
    finalDisplayedUrl: z.string().optional(),
    lighthouseVersion: z.string().optional(),
    fetchTime: z.string().optional(),
    runtimeError: z.object({ code: z.string().optional(), message: z.string().optional() }).passthrough().optional(),
    categories: z.object({
      performance: z.object({ score: z.number().nullable() }).passthrough().optional(),
    }).passthrough(),
    audits: z.record(z.string(), AuditSchema),
  }).passthrough(),
}).passthrough();
export type PsiResponse = z.infer<typeof PsiResponseSchema>;
