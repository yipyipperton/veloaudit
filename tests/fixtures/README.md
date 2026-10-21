# TEST FIXTURES — SYNTHETIC DATA
Every file in this directory is **hand-written, synthetic** data used only by tests.
The numbers are invented and are NOT real measurements of any website. Never seed the production database or UI with them.

`psi-synthetic.ts` mirrors the PSI v5 response shape, including Lighthouse 13-style audits
(`*-insight` audits and `metricSavings`-only audits such as `bootup-time`) that were observed in real runs.

Exception: `psi-real-webdev-mobile-excerpt.json` is a **real, trimmed** PSI response excerpt for https://web.dev/ (mobile),
captured 2026-10-21. It is labeled in its `_FIXTURE_NOTE` field and is used only by regression tests.

Exception: `psi-real-webdev-mobile-categories-excerpt.json` is a **real, trimmed** PSI response for https://web.dev/ (mobile)
requested with all four categories (performance, accessibility, best-practices, seo), captured 2026-10-21. Category objects,
`auditRefs` and `categoryGroups` are complete; only the audits those categories reference (plus the 5 core lab metrics) are kept,
`details.items` are cut to 3 and `debugData` is removed. Values are unmodified. It is labeled in its `_fixture` field.
