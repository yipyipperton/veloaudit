# VeloAudit Architecture (draft, Phase 1)

```
Browser ──► Next.js (App Router)            Worker process (tsx src/worker)
            /api/audits  ─ validate ─► Postgres ◄── processAudit ─► PSI v5 API
                         └─ enqueue ─► Redis/BullMQ ──────┘
```

## Modules (`src/server`)
| Module | Responsibility |
| --- | --- |
| `app/api/**` | HTTP routes only: rate limit, Zod parse, call orchestration, serialize |
| `validation/` | Zod schemas; URL policy (http/https only, no credentials, no localhost/private/link-local IPs, DNS resolution with every address checked) |
| `orchestration/` | `enqueueAudit` (API side) and `processAudit` (worker side); BullMQ queue |
| `psi/client.ts` | PSI fetch with per-attempt timeout (120s) and exponential backoff + jitter on 429/5xx/timeout/network; daily-quota 429 fails fast |
| `psi/parser.ts` + `schema.ts` | Zod-validated parse of lab metrics and CrUX field metrics. Missing → `null`. INP is never derived from TBT |
| `recommendations/` | Opportunities = failing Lighthouse audits with real savings (`details.type=opportunity` or `metricSavings`) |
| `persistence/` | Prisma access. `Audit` table indexed on `createdAt`, `status`, `(url, strategy, createdAt)` |
| `http/` | Safe JSON errors, in-memory rate limiter, DTO serialization |
| `logger.ts` | Structured JSON logs (stdout/stderr) |

UI lives in `src/components` (shadcn/ui) and polls the API every 2–3s.

## Job lifecycle
`QUEUED` (row created + job enqueued, jobId = audit id) → `RUNNING` → `SUCCEEDED` | `FAILED (errorCode, errorMessage)`.
PSI retries happen inside the client; the BullMQ job itself runs once.

## Known Phase 1 limitations
- Rate limiter is in-memory per process (move to Redis for multi-instance).
- PSI performs the fetch from Google's network, so DNS checks are a policy guard rather than our own SSRF boundary; DNS rebinding between check and PSI fetch is not mitigated.
- No auth, no history comparison, no scheduled audits; raw PSI JSON is not stored.
