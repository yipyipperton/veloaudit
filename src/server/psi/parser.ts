import { PsiResponseSchema, type PsiResponse } from "./schema";
import { extractDiagnostics, extractOpportunities, type Opportunity } from "../recommendations/opportunities";

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

/** Lighthouse per-metric scores (0-1), null when not reported. */
export type LabMetricScores = { lcp: number | null; fcp: number | null; si: number | null; tbt: number | null; cls: number | null };
/** CrUX histogram as [good, needs improvement, poor] proportions. */
export type Distribution = [number, number, number];
export type FieldDistributions = Partial<Record<"lcp" | "inp" | "cls" | "fcp" | "ttfb", Distribution>>;

export type ScreenshotImage = { mime: string; data: Buffer; timingMs: number | null };
export type Screenshots = { final: ScreenshotImage | null; thumbnails: ScreenshotImage[] };

export type ParsedAudit = {
  finalUrl: string | null;
  lighthouseVersion: string | null;
  fetchTime: string | null;
  lab: LabMetrics;
  field: FieldMetrics;
  opportunities: Opportunity[];
  diagnostics: Opportunity[];
  labMetricScores: LabMetricScores;
  fieldDistributions: FieldDistributions;
  screenshots: Screenshots;
};

export class PsiParseError extends Error {}

function num(audits: PsiResponse["lighthouseResult"]["audits"], id: string): number | null {
  const v = audits[id]?.numericValue;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const EMPTY_FIELD: FieldMetrics = { scope: null, overall: null, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null };

function score(audits: PsiResponse["lighthouseResult"]["audits"], id: string): number | null {
  const v = audits[id]?.score;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const FIELD_KEYS = {
  lcp: "LARGEST_CONTENTFUL_PAINT_MS", inp: "INTERACTION_TO_NEXT_PAINT", cls: "CUMULATIVE_LAYOUT_SHIFT_SCORE",
  fcp: "FIRST_CONTENTFUL_PAINT_MS", ttfb: "EXPERIMENTAL_TIME_TO_FIRST_BYTE",
} as const;

/** Only well-formed 3-bucket CrUX histograms are kept; anything else is treated as unavailable. */
function parseDistributions(r: PsiResponse): FieldDistributions {
  const metrics = r.loadingExperience?.metrics ?? {};
  const out: FieldDistributions = {};
  for (const [k, key] of Object.entries(FIELD_KEYS) as [keyof typeof FIELD_KEYS, string][]) {
    const d = metrics[key]?.distributions;
    if (!d || d.length !== 3) continue;
    const p = d.map((b) => b.proportion);
    if (p.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) continue;
    out[k] = [p[0]!, p[1]!, p[2]!];
  }
  return out;
}

const DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** Decode a Lighthouse screenshot data URI. Only raster image types; oversized or malformed input is dropped. */
export function decodeImage(uri: unknown, timingMs: number | null = null): ScreenshotImage | null {
  if (typeof uri !== "string" || uri.length > MAX_IMAGE_BYTES * 1.4) return null;
  const m = DATA_URI.exec(uri);
  if (!m) return null;
  const data = Buffer.from(m[2]!, "base64");
  return data.length > 0 && data.length <= MAX_IMAGE_BYTES ? { mime: m[1]!, data, timingMs } : null;
}

function parseScreenshots(audits: PsiResponse["lighthouseResult"]["audits"]): Screenshots {
  const fd = audits["final-screenshot"]?.details as Record<string, unknown> | undefined;
  const final = decodeImage(fd?.["data"]);
  const td = audits["screenshot-thumbnails"]?.details as Record<string, unknown> | undefined;
  const items = Array.isArray(td?.["items"]) ? (td["items"] as unknown[]) : [];
  const thumbnails: ScreenshotImage[] = [];
  for (const it of items.slice(0, 12)) {
    if (typeof it !== "object" || it === null) continue;
    const rec = it as Record<string, unknown>;
    const img = decodeImage(rec["data"], typeof rec["timing"] === "number" ? rec["timing"] : null);
    if (img) thumbnails.push(img);
  }
  return { final, thumbnails };
}

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
    diagnostics: extractDiagnostics(a),
    labMetricScores: {
      lcp: score(a, "largest-contentful-paint"), fcp: score(a, "first-contentful-paint"), si: score(a, "speed-index"),
      tbt: score(a, "total-blocking-time"), cls: score(a, "cumulative-layout-shift"),
    },
    fieldDistributions: parseDistributions(r),
    screenshots: parseScreenshots(a),
  };
}
