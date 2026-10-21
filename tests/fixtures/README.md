# TEST FIXTURES — SYNTHETIC DATA
Every file in this directory is a **hand-written, synthetic** PSI response used only by unit tests.
The numbers are invented and are NOT real measurements of any website. Never seed the database or UI with them.

Exception: `psi-real-webdev-mobile-excerpt.json` is a **real, trimmed** PSI response excerpt for https://web.dev/ (mobile),
captured 2026-10-21. It is labeled in its `_FIXTURE_NOTE` field and is used only by regression tests.
