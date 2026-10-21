/**
 * SYNTHETIC TEST FIXTURES — NOT REAL DATA.
 * Hand-written to mirror the PSI v5 response shape. Values are invented for parser tests only.
 */
/** SYNTHETIC 1x1 PNG (not a real page screenshot). */
export const SYNTHETIC_PNG_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const SYNTHETIC_PSI_WITH_FIELD = {
  id: "https://fixture.invalid/",
  loadingExperience: {
    id: "https://fixture.invalid/",
    origin_fallback: true,
    overall_category: "AVERAGE",
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2600, category: "AVERAGE", distributions: [{ min: 0, max: 2500, proportion: 0.7 }, { min: 2500, max: 4000, proportion: 0.2 }, { min: 4000, proportion: 0.1 }] },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: "FAST", distributions: [{ min: 0, max: 200, proportion: 0.8 }, { min: 200, max: 500, proportion: 0.15 }] },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: "FAST" },
      FIRST_CONTENTFUL_PAINT_MS: { percentile: 1500, category: "FAST" },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 700, category: "AVERAGE" },
    },
  },
  lighthouseResult: {
    finalDisplayedUrl: "https://fixture.invalid/",
    lighthouseVersion: "0.0.0-SYNTHETIC",
    fetchTime: "2000-01-01T00:00:00.000Z",
    categories: { performance: { score: 0.73 } },
    audits: {
      "largest-contentful-paint": { id: "largest-contentful-paint", title: "LCP", score: 0.5, numericValue: 3100 },
      "first-contentful-paint": { id: "first-contentful-paint", title: "FCP", score: 0.8, numericValue: 1800 },
      "speed-index": { id: "speed-index", title: "SI", score: 0.7, numericValue: 4000 },
      "total-blocking-time": { id: "total-blocking-time", title: "TBT", score: 0.6, numericValue: 450 },
      "cumulative-layout-shift": { id: "cumulative-layout-shift", title: "CLS", score: 1, numericValue: 0.02 },
      "server-response-time": { id: "server-response-time", title: "TTFB", score: 1, numericValue: 120 },
      "render-blocking-resources": { id: "render-blocking-resources", title: "Eliminate render-blocking resources", description: "See [docs](https://x.invalid).", score: 0.3, scoreDisplayMode: "metricSavings", details: { type: "opportunity", overallSavingsMs: 900 } },
      "unused-javascript": { id: "unused-javascript", title: "Reduce unused JavaScript", score: 0.5, scoreDisplayMode: "metricSavings", details: { type: "opportunity", overallSavingsMs: 300, overallSavingsBytes: 50000 } },
      "uses-http2": { id: "uses-http2", title: "Passing audit", score: 1, details: { type: "opportunity", overallSavingsMs: 0 } },
      "dom-size": { id: "dom-size", title: "Avoid an excessive DOM size", score: 0.4, scoreDisplayMode: "numeric", displayValue: "2,000 elements",
        details: { type: "table", headings: [{ key: "statistic", label: "Statistic", valueType: "text" }, { key: "value", label: "Value", valueType: "numeric" }], items: [{ statistic: "Total DOM Elements", value: 2000 }] } },
      "final-screenshot": { id: "final-screenshot", title: "Final Screenshot", score: null, scoreDisplayMode: "informative", details: { type: "screenshot", data: SYNTHETIC_PNG_DATA_URI } },
      "screenshot-thumbnails": { id: "screenshot-thumbnails", title: "Screenshot Thumbnails", score: null, scoreDisplayMode: "informative",
        details: { type: "filmstrip", items: [{ timing: 300, data: SYNTHETIC_PNG_DATA_URI }, { timing: 600, data: "data:text/html;base64,PHNjcmlwdD4=" }, { timing: 900, data: SYNTHETIC_PNG_DATA_URI }] } },
    },
  },
} as const;

/** SYNTHETIC: Lighthouse lab data only, no CrUX field data (common for low-traffic sites). */
export const SYNTHETIC_PSI_NO_FIELD = {
  lighthouseResult: {
    categories: { performance: { score: 1 } },
    audits: {
      "largest-contentful-paint": { id: "largest-contentful-paint", title: "LCP", numericValue: 800 },
      "total-blocking-time": { id: "total-blocking-time", title: "TBT", numericValue: 250 },
    },
  },
} as const;

/**
 * SYNTHETIC, modeled on the Lighthouse 13 audit shapes seen in real web.dev runs (values invented):
 * `bootup-time` has only TBT metricSavings and a `table` details type; `render-blocking-insight` is an insight audit.
 */
export const SYNTHETIC_PSI_LH13_SHAPES = {
  loadingExperience: {
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3000, category: "AVERAGE" },
      INTERACTION_TO_NEXT_PAINT: { percentile: 230, category: "AVERAGE" },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 1, category: "FAST" },
    },
  },
  lighthouseResult: {
    lighthouseVersion: "13.x-SYNTHETIC",
    categories: { performance: { score: 0.35 } },
    audits: {
      "largest-contentful-paint": { id: "largest-contentful-paint", title: "LCP", score: 0, numericValue: 14000 },
      "server-response-time": { id: "server-response-time", title: "Initial server response time was short", score: 1, numericValue: 4 },
      "bootup-time": { id: "bootup-time", title: "Reduce JavaScript execution time", score: 0, scoreDisplayMode: "metricSavings", metricSavings: { TBT: 800 }, displayValue: "3.4 s", details: { type: "table" } },
      "render-blocking-insight": { id: "render-blocking-insight", title: "Render-blocking requests", score: 0, scoreDisplayMode: "metricSavings", metricSavings: { LCP: 1800, FCP: 1800 }, details: { type: "table" } },
      "unsized-images": { id: "unsized-images", title: "Image elements do not have explicit width and height", score: 0.5, scoreDisplayMode: "metricSavings", metricSavings: { CLS: 0 }, details: { type: "table" } },
      "layout-shifts": { id: "layout-shifts", title: "Avoid large layout shifts", score: 0, scoreDisplayMode: "metricSavings", metricSavings: { CLS: 0.129 }, details: { type: "table" } },
    },
  },
} as const;
