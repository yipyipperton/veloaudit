# TEST FIXTURES — SYNTHETIC DATA
Every file in this directory is **hand-written, synthetic** data used only by tests.
The numbers are invented and are NOT real measurements of any website. Never seed the production database or UI with them.

`psi-synthetic.ts` mirrors the PSI v5 response shape, including Lighthouse 13-style audits
(`*-insight` audits and `metricSavings`-only audits such as `bootup-time`) that were observed in real runs.

Exception: `psi-real-webdev-mobile-excerpt.json` is a **real, trimmed** PSI response excerpt for https://web.dev/ (mobile),
captured 2026-10-21. It is labeled in its `_FIXTURE_NOTE` field and is used only by regression tests.
