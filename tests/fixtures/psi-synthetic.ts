/**
 * SYNTHETIC TEST FIXTURE — NOT REAL DATA.
 * Hand-written to mirror the PSI v5 response shape. Values are invented for parser tests only.
 */
export const SYNTHETIC_PSI_WITH_FIELD = {
  id: "https://fixture.invalid/",
  loadingExperience: {
    id: "https://fixture.invalid/",
    origin_fallback: true,
    overall_category: "AVERAGE",
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2600, category: "AVERAGE" },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: "FAST" },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: "FAST" },
      FIRST_CONTENTFUL_PAINT_MS: { percentile: 1500, category: "FAST" },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 700, category: "AVERAGE" },
    },
  },
  lighthouseResult: {
    finalDisplayedUrl: "https://fixture.invalid/",
    lighthouseVersion: "0.0.0-fixture",
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
