# VeloAudit Architecture

```
Browser ──► Next.js App Router (UI + route handlers)
              │  validate (Zod, URL policy) · rate limit · serialize
              ├──► PostgreSQL (Prisma): Audit, Budget
              └──► Redis (BullMQ "audits") ──► Worker process ──► PSI v5
                                                   └──► PostgreSQL (results)
```

## Modules

| Path | Responsibility |
| --- | --- |
| `src/app/api/**` | Route handlers only: rate limit, parse/guard the body, call a module, serialize. Wrapped in `safe()` so errors become JSON 500s. |
| `src/server/validation/` | Zod schemas (`schemas.ts`, `budgets.ts`) and the URL policy (`url.ts`, `ip.ts`): http/https only, no credentials, no local/private/link-local/CGNAT/multicast IPs, DNS resolution with every address checked (system resolver or DoH). |
| `src/server/orchestration/` | `enqueueAudit` (API side) and `processAudit` (worker side, dependency-injected PSI runner, job deadline), plus stale-job recovery and the queue factory. |
| `src/server/psi/` | `client.ts` (timeouts, backoff + jitter, error classification), `schema.ts` (Zod shape of the PSI response), `parser.ts` (lab and field extraction; missing → `null`). |
| `src/server/recommendations/` | Opportunities: failing Lighthouse audits with real savings (`details.type=opportunity` or `metricSavings`), sorted by max ms savings. |
| `src/server/persistence/` | Prisma repositories for audits (create, status changes, history, stale recovery) and budgets (upsert, list, delete). |
| `src/server/report/` | Markdown and HTML report rendering, with escaping. |
| `src/server/http/` | JSON errors, the in-memory rate limiter, body guards, DTO serialization. |
| `src/lib/` | **Pure, shared domain logic** (server and client): metric definitions (`metrics.ts`), budget evaluation (`budgets.ts`), audit comparison (`compare.ts`), DTO types. |
| `src/components/` | UI (shadcn/ui, Recharts, next-themes): dashboard, audit detail, budgets panel, history charts, compare view. |
| `src/worker/index.ts` | The BullMQ worker entry point (a separate process), with graceful shutdown. |

## Execution modes

`enqueueRun(url, "mobile" | "desktop" | "both", { schedule })` creates an `AuditRun` and one audit per device atomically, then either
adds one BullMQ job per device (`queue`, the default; the worker's `WORKER_CONCURRENCY >= 2` runs them in parallel) or, when
`AUDIT_EXECUTION_MODE=inline`, passes a single task that runs `processAudit(id)` for every device with `Promise.all` to the platform scheduler (Next.js `after()`, i.e. Vercel `waitUntil`). The route sets `maxDuration = 300`.
`processAudit` is the same function in both modes, so the deadline, error codes and persistence behave identically. Inline mode is
for demos: it has no durable queue and is limited by function lifetime and concurrency.

## Data model

- `AuditRun`: one row per submission, grouping its device audits (`Audit.runId`, cascade delete, indexed).
- `AuditAsset`: screenshot bytes (`kind` = `final` | `thumb`, `idx`, `mime`, `timingMs`), unique per `(auditId, kind, idx)`.
  Decoded from the Lighthouse data URIs already in the PSI response, so the audited site is never fetched by us. Kept out of the
  audit row so list/history queries stay light; replaced atomically with the result in one transaction.
- `Audit`: one row per device. Lab columns (`lab*`), field columns (`field*` plus categories and `fieldScope`), `opportunities` / `diagnostics` (JSON, with up to 5 detail rows each), `labMetricScores` (Lighthouse 0-1 per metric) and
  `fieldDistributions` (CrUX good/NI/poor proportions).
  Indexed on `createdAt`, `status`, and `(url, strategy, createdAt)` for history queries.
- `Budget`: `(url, strategy, source, metric, threshold)`, unique per `(url, strategy, source, metric)` and indexed on `(url, strategy)`.

## Job lifecycle

`QUEUED` (row created and job enqueued, with jobId = audit id) → `RUNNING` → `SUCCEEDED` or `FAILED(errorCode)`.

- PSI retries happen inside the client (up to 4 attempts, 2 s × 2ⁿ plus jitter). The BullMQ job itself runs once.
- The job deadline (`AUDIT_JOB_TIMEOUT_MS`) aborts the in-flight fetch and records `JOB_TIMEOUT`.
- Audits that have already finished are never reprocessed. On startup the worker marks old `QUEUED`/`RUNNING` rows as `STALE`.

## Lab vs field rules

- These are separate data sets end to end: parser, columns, DTO, charts, comparison tables and budget sources.
- Missing field data → `null` → "Unavailable" in the UI, a gap in charts, `not_comparable` in comparisons, `not_evaluable` for budgets.
- INP comes only from CrUX `INTERACTION_TO_NEXT_PAINT`. It is never estimated from TBT.
- PSI reports CrUX CLS ×100, so the value is divided back. The lab "server response" (`server-response-time`) is labelled as backend latency only.

## Comparison and variance

`compareAudits` (in `src/lib/compare.ts`) reports deltas and applies a noise floor: max(10 ms, 5%) for times, 2 points for the score,
0.01 for CLS. Every comparison response carries a caveat that one pair of runs does not prove a change.

## Testing

| Layer | Scope |
| --- | --- |
| Unit (`tests/unit`) | URL policy, parser (synthetic and real-excerpt fixtures), PSI retry/backoff, budgets, comparison, report escaping |
| Integration (`tests/integration`) | Real Postgres and Redis: persistence, indexes, job lifecycle (retry, timeout, deadline, parse errors, a full BullMQ run), API validation, history/compare/budgets/report routes |
| E2E (`tests/e2e`) | Playwright: input validation, live audit (opt-in), field-unavailable UI (mocked, SYNTHETIC), history/compare/budgets (DB-seeded, SYNTHETIC), theme toggle |

CI (`.github/workflows/ci.yml`) runs `scripts/ci-steps.sh`. `scripts/ci-local.sh` runs the same steps from a clean copy against local services.

## Deployment

The web tier is stateless. The worker must run on a long-running host (not serverless). PostgreSQL and Redis are managed services.
See README → Deployment architecture.

## Known limitations

See README → Known limitations.
