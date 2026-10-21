# VeloAudit (Phase 1)

Web performance auditor. Submit a public URL + mobile/desktop; a BullMQ worker calls the Google
PageSpeed Insights v5 API, stores Lighthouse **lab** metrics and CrUX **field** metrics separately in
PostgreSQL, and the dashboard polls job status and renders results plus Lighthouse opportunities.

## Requirements
Node 20+, PostgreSQL 14+, Redis 6+.

## Setup
```bash
cp .env.example .env        # set DATABASE_URL, REDIS_URL, optionally PSI_API_KEY
npm ci
npx prisma migrate deploy
npm run build
npm start                   # web on :3000
npm run worker              # separate process: BullMQ worker
```
Dev: `npm run dev` + `npm run worker`.

## Environment
| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `REDIS_URL` | yes | default `redis://localhost:6379` |
| `PSI_API_KEY` | no | Without it, keyless requests are tried. Google's shared keyless quota is often exhausted (HTTP 429 "Queries per day"); get a key at https://developers.google.com/speed/docs/insights/v5/get-started |
| `DNS_RESOLVER` | no | `system` (default) or `doh` (Google DNS-over-HTTPS) for hosts whose resolver returns synthetic IPs |

## Tests
```bash
npm test            # Vitest unit tests (URL validation, parser, PSI retry) — fixtures are SYNTHETIC
npm run test:e2e    # Playwright against a running app + worker
```

## API
- `POST /api/audits` `{ "url": "https://example.com", "strategy": "mobile" | "desktop" }` → 202 `{ audit }`
- `GET /api/audits` → latest 25
- `GET /api/audits/:id`

Errors are always `{ "error": { "code", "message" } }`; no stack traces.
