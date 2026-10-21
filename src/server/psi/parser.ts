import { PsiResponseSchema, type PsiResponse } from "./schema";
import { extractOpportunities, type Opportunity } from "../recommendations/opportunities";

export type LabMetrics = {
  score: number | null; // 0-100
  lcpMs: number | null;
  fcpMs: number | null;
  speedIndexMs: number | null;
  tbtMs: number | null;
  cls: number | null;
  ttfbMs: number | null; // Lighthouse server-response-time (backend only)
};

export type FieldMetric = { value: number; category: string | null } | null;
export type FieldMetrics = {
  scope: "url" | "origin" | null; // null => no CrUX data at all
  overall: string | null;
  lcpMs: FieldMetric;
  inpMs: FieldMetric;
  cls: FieldMetric;
  fcpMs: FieldMetric;
  ttfbMs: FieldMetric;
};

export type ParsedAudit = {
  finalUrl: string | null;
  lighthouseVersion: string | null;
  fetchTime: string | null;
  lab: LabMetrics;
  field: FieldMetrics;
  opportunities: Opportunity[];
};

export class PsiParseError extends Error {}

function num(audits: PsiResponse["lighthouseResult"]["audits"], id: string): number | null {
  const v = audits[id]?.numericValue;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const EMPTY_FIELD: FieldMetrics = { scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null };

function parseField(r: PsiResponse): FieldMetrics {
  const le = r.loadingExperience;
  const metrics = le?.metrics;
  if (!le || !metrics || Object.keys(metrics).length === 0) return EMPTY_FIELD;
  const get = (key: string, scale = 1): FieldMetric => {
    const m = metrics[key];
    return m ? { value: m.percentile / scale, category: m.category ?? null } : null;
  };
  return {
    scope: le.origin_fallback ? "origin" : "url",
    overall: le.overall_category ?? null,
    lcpMs: get("LARGEST_CONTENTFUL_PAINT_MS"),
    inpMs: get("INTERACTION_TO_NEXT_PAINT"), // never derived from TBT
    cls: get("CUMULATIVE_LAYOUT_SHIFT_SCORE", 100), // CrUX reports CLS x100
    fcpMs: get("FIRST_CONTENTFUL_PAINT_MS"),
    ttfbMs: get("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
  };
}

export function parsePsiResponse(json: unknown): ParsedAudit {
  const res = PsiResponseSchema.safeParse(json);
  if (!res.success) throw new PsiParseError("PSI response did not match expected shape");
  const r = res.data;
  const lr = r.lighthouseResult;
  if (lr.runtimeError?.code && lr.runtimeError.code !== "NO_ERROR")
    throw new PsiParseError(`Lighthouse runtime error: ${lr.runtimeError.code}`);
  const raw = lr.categories.performance?.score;
  const a = lr.audits;
  return {
    finalUrl: lr.finalDisplayedUrl ?? lr.finalUrl ?? null,
    lighthouseVersion: lr.lighthouseVersion ?? null,
    fetchTime: lr.fetchTime ?? null,
    lab: {
      score: typeof raw === "number" ? Math.round(raw * 100) : null,
      lcpMs: num(a, "largest-contentful-paint"),
      fcpMs: num(a, "first-contentful-paint"),
      speedIndexMs: num(a, "speed-index"),
      tbtMs: num(a, "total-blocking-time"),
      cls: num(a, "cumulative-layout-shift"),
      ttfbMs: num(a, "server-response-time"),
    },
    field: parseField(r),
    opportunities: extractOpportunities(a),
  };
}
