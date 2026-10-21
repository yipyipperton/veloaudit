# VeloAudit HTTP API

Base URL: the web app (for example `http://localhost:3000`). All endpoints are JSON unless noted otherwise.

## Conventions

- **Errors** always have the shape `{ "error": { "code": string, "message": string } }`. Stack traces are never included.
- **Rate limits** are per client IP (from `x-forwarded-for`, then `x-real-ip`):
  - creating audits: 10 per minute
  - creating or deleting budgets: 30 per minute
  - reads: 120 per minute
  
  When a limit is hit the API returns `429 RATE_LIMITED` (audit creation also sets `retry-after`).
- **Write bodies** must use `Content-Type: application/json` (otherwise 415) and be at most 4 KB (otherwise 413).
- **IDs** match `^[a-z0-9]{20,40}$` (anything else returns `400 INVALID_ID`). New runs, audits and budgets use **cuid2**
  (24 chars, from a cryptographically secure random source, no timestamp or counter prefix), so ids are not guessable.
  Rows created before this change use cuid v1 ids, which are partly time-based.
- **Privacy (anonymous owner session):** see [Ownership and share links](#ownership-and-share-links).
- **URLs** are normalized (fragment removed, trailing slash added for bare origins). `https://web.dev` becomes `https://web.dev/`.
- **Units:** times are in milliseconds, CLS is unitless, and the score is 0–100. `null` means *unavailable*: it is never estimated, and field INP is never derived from lab TBT.

## Ownership and share links

There are no accounts. The first write (`POST /api/audits` or `POST /api/budgets`) sets an anonymous owner cookie:

```
Set-Cookie: __Host-va_owner=v1.<ownerId>.<sig>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000
```

`ownerId` is 32 random bytes (base64url) and `sig` is HMAC-SHA256(`SESSION_SECRET`, `v1.<ownerId>`). A missing, malformed or
tampered cookie is treated as anonymous; the next write issues a fresh owner. The database stores only `sha256(ownerId)` on runs,
audits and budgets, never the id itself. Rate limits stay per IP.

| Endpoint | Access rule |
| --- | --- |
| `POST /api/audits`, `POST /api/budgets` | Creates or reuses the caller's anonymous owner (sets the cookie if missing or invalid); new rows are stamped with the owner hash |
| `GET /api/audits` (recent) | Caller's own audits only; `[]` without a valid cookie |
| `GET /api/history` | Caller's own completed audits only |
| `GET /api/compare` | Both audits must be the caller's own, otherwise `404 NOT_FOUND` |
| `GET /api/budgets`, `DELETE /api/budgets/:id` | Caller's own budgets only; deleting someone else's id returns `404` |
| `GET /api/runs/:id`, `GET /api/audits/:id` | **Capability:** anyone with the id can view it (share link). Responses include `viewerIsOwner` |
| `GET /api/audits/:id/report`, `GET /api/audits/:id/screenshot` | **Capability**, same rule as the audit itself (the shared page needs its images and report). Budget results in a report are the *viewer's* own budgets, so none for anonymous viewers |

**A run or audit link is a capability:** whoever has the URL can view that result, so share it deliberately. It doesn't
reveal or grant access to anything else: the viewer's lists, history, compare and budgets stay their own. Audits created
before ownership existed have no owner; they are hidden from every list but their old links still open.

## Audit object

```jsonc
{
  "id": "cmv…",
  "url": "https://web.dev/",
  "strategy": "mobile",                 // "mobile" | "desktop"
  "runId": "cmv…",                      // linked run (null for audits created before runs existed)
  "status": "SUCCEEDED",                // QUEUED | RUNNING | SUCCEEDED | FAILED
  "error": null,                        // { code, message } when FAILED
  "createdAt": "…", "startedAt": "…", "completedAt": "…",
  "finalUrl": "https://web.dev/", "lighthouseVersion": "13.5.0", "fetchTime": "…",
  "lab": { "score": 38, "lcpMs": 12000, "fcpMs": 11100, "speedIndexMs": 11100, "tbtMs": 556, "cls": 0.118, "ttfbMs": 3 },
  "field": {
    "scope": "url",                     // "url" | "origin" | null (no CrUX data)
    "overall": "SLOW",
    "lcpMs": { "value": 3069, "category": "AVERAGE" },
    "inpMs": { "value": 228, "category": "AVERAGE" },
    "cls":   { "value": 0.01, "category": "FAST" },
    "fcpMs": { "value": 3065, "category": "SLOW" },
    "ttfbMs":{ "value": 1705, "category": "AVERAGE" }
  },
  "opportunities": [
    { "id": "unused-javascript", "title": "Reduce unused JavaScript", "description": "…", "score": 0,
      "displayValue": "Est savings of 870 KiB", "savingsMs": 4350, "savingsBytes": 890880, "metricSavings": { "LCP": 4350 },
      "table": { "headings": ["URL", "Transfer Size", "Est Savings"], "rows": [["https://…/app.js", "512.0 KiB", "300.1 KiB"]] } }
  ],
  "diagnostics": [ /* same shape: failing audits WITHOUT estimated metric savings */ ],
  "labMetricScores": { "lcp": 0.51, "fcp": 0.24, "si": 0.67, "tbt": 0.24, "cls": 0.85 },   // Lighthouse 0-1 scores, drive ●/■/▲ indicators
  "fieldDistributions": { "lcp": [0.6613, 0.1761, 0.1626] },  // CrUX [good, needs improvement, poor]; omitted when not reported
  "screenshots": {
    "final": { "src": "/api/audits/cmv…/screenshot?kind=final&i=0", "timingMs": null },
    "thumbnails": [{ "src": "/api/audits/cmv…/screenshot?kind=thumb&i=0", "timingMs": 428 }]
  }
}
```

`table` holds at most 5 rows copied from the Lighthouse audit's `details` (pre-formatted strings). Absent data is never estimated:
a metric without a CrUX histogram has no `fieldDistributions` entry, and an audit without screenshots has `final: null`.

## Run object

A run groups the per-device audits created by one submission.

```jsonc
{ "id": "cmv…", "url": "https://web.dev/", "createdAt": "…",
  "status": "RUNNING",          // QUEUED | RUNNING | SUCCEEDED | PARTIAL (some device failed) | FAILED (all failed)
  "audits": [Audit /* mobile */, Audit /* desktop */] }   // ordered mobile, desktop
```

`lab.ttfbMs` is Lighthouse's `server-response-time`, which measures backend latency for the root document. It is **not** a full TTFB.

**Failure codes:**

| Code | Meaning |
| --- | --- |
| `PSI_RATE_LIMITED` | PSI rate limit (429) |
| `PSI_DAILY_QUOTA` | PSI daily quota exhausted |
| `PSI_UPSTREAM` | PSI 5xx error |
| `PSI_BAD_REQUEST` | PSI rejected the request (4xx) |
| `PSI_FORBIDDEN` | PSI returned 403 (for example an invalid key) |
| `PSI_TIMEOUT` | A PSI request timed out |
| `PSI_NETWORK` | Network error reaching PSI |
| `PSI_BAD_RESPONSE` | PSI returned a non-JSON body |
| `PSI_PARSE` | The PSI response did not have the expected shape, or Lighthouse reported a runtime error |
| `JOB_TIMEOUT` | The job exceeded its deadline |
| `QUEUE_UNAVAILABLE` | The job could not be enqueued |
| `STALE` | The worker was interrupted before the audit finished |
| `INTERNAL` | Unexpected worker error |

---

## `POST /api/audits`

Creates a run with one audit per device and hands them to the executor. `strategy: "both"` (the UI default) creates
mobile **and** desktop audits that execute **in parallel**: in `queue` mode (default) as two BullMQ jobs consumed by a worker with
`WORKER_CONCURRENCY >= 2`; in `inline` demo mode as one `after()` task that runs both with `Promise.all`. The response is the same in both modes.
One submission counts once against the create rate limit but uses one PSI request per device.

Request: `{ "url": "https://example.com", "strategy": "mobile" | "desktop" | "both" }` (no extra keys allowed)

| Status | Code | When |
| --- | --- | --- |
| 202 | — | `{ "run": Run, "audit": Audit }`, all audits `QUEUED`. `audit` is the first device (kept for single-strategy clients). |
| 400 | `INVALID_JSON` / `INVALID_INPUT` | Malformed body or schema |
| 400 | `INVALID_URL` | Not http/https, has credentials, local, private or link-local IP, unresolvable, or resolves to a private address |
| 413 / 415 / 429 | | See Conventions |
| 503 | `QUEUE_UNAVAILABLE` | Redis is unreachable (the audit is stored as FAILED) |

```bash
curl -X POST localhost:3000/api/audits -H 'content-type: application/json' -d '{"url":"https://web.dev","strategy":"both"}'
```

## `GET /api/runs/:id`

Returns `{ "run": Run }`, or `400 INVALID_ID` / `404 NOT_FOUND`. Poll while any audit is `QUEUED` or `RUNNING`; each device
progresses independently (live per-device status in the UI).

## `GET /api/audits/:id/screenshot?kind=final|thumb&i=<n>`

Serves a Lighthouse screenshot stored when the audit completed. The bytes are decoded from the `final-screenshot` and
`screenshot-thumbnails` data URIs **inside the PSI response**; VeloAudit never fetches the audited site itself. Only
`image/jpeg|png|webp` up to 2 MB are accepted. Responses are `immutable`-cached and sent with `X-Content-Type-Options: nosniff`
and `Content-Security-Policy: default-src 'none'; sandbox`. Errors: `400 INVALID_ID` / `INVALID_INPUT`, `404 NOT_FOUND`.

## `GET /api/audits`

Returns the 25 most recent audits, newest first: `{ "audits": Audit[] }`.

## `GET /api/audits/:id`

Returns `{ "audit": Audit }`, or `400 INVALID_ID` / `404 NOT_FOUND`. Poll this endpoint while the status is `QUEUED` or `RUNNING`.

## `GET /api/audits/:id/report?format=html|md&download=0|1`

Returns a report with the metrics, budget results (from the budgets saved for that URL and strategy), and the issues and fixes Lighthouse reported.

- `format=html` (default): `text/html` with print CSS. Served with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'`
  (the inline script only powers the Print button) and `X-Content-Type-Options: nosniff`. All content is HTML-escaped.
- `format=md`: `text/markdown`.
- `download=1` adds `Content-Disposition: attachment; filename="veloaudit-<id>.<ext>"`.

Errors: `400 INVALID_ID`, `400 INVALID_INPUT` (bad format), `404 NOT_FOUND`.

## `GET /api/history?url=&strategy=`

Returns completed (`SUCCEEDED`) audits for one URL and strategy, **oldest first**, up to 100:
`{ "url": "https://web.dev/", "strategy": "mobile", "audits": Audit[] }`.

Errors: `400 INVALID_INPUT` (bad URL, local or private URL, or bad strategy).

## `GET /api/compare?a=<id>&b=<id>`

Compares two completed audits of the same URL and strategy. The older audit is always `before`, whatever the parameter order.

```jsonc
{
  "before": Audit, "after": Audit,
  "caveat": "A single pair of runs does not prove an improvement or regression. …",
  "deltas": [
    { "def": { "source": "lab", "key": "score", "label": "Performance score", "unit": "score", "better": "higher" },
      "before": 56, "after": 38, "delta": -18, "pct": -32.1, "verdict": "regressed" }
  ]
}
```

- `verdict` is one of `improved`, `regressed`, `unchanged` (within the noise floor) or `not_comparable` (a value is missing on either side).
- The noise floor is max(10 ms, 5% of the baseline) for times, 2 points for the score and 0.01 for CLS.
- Lab and field deltas are separate entries (`def.source`).

Errors: `400 INVALID_ID`, `404 NOT_FOUND`, `422 NOT_COMPARABLE` (different URL or strategy, not completed, or the same audit twice).

## Budgets

A budget is a target for one metric, from one **explicit source**:

| source | metrics | comparator |
| --- | --- | --- |
| `lab` | `score` (0–100), `lcp`, `fcp`, `si`, `tbt`, `cls`, `ttfb` (server response) | `score` is `>=`; all others are `<=` |
| `field` | `lcp`, `inp`, `cls`, `fcp`, `ttfb` (CrUX p75) | `<=` |

Evaluation result: `pass`, `fail` or `not_evaluable`. A budget is `not_evaluable` when the metric is unavailable for that source, the audit
didn't succeed, or the metric/source combination is unknown (for example lab INP, which doesn't exist). It is never reported as `pass` in those cases.

### `GET /api/budgets?url=&strategy=[&auditId=]`

```jsonc
{
  "budgets": [{ "id": "…", "url": "https://web.dev/", "strategy": "mobile", "source": "field", "metric": "inp", "threshold": 200, "createdAt": "…" }],
  "evaluatedAuditId": "cmv…",           // latest SUCCEEDED audit, or the given auditId; null if none
  "results": [{ "source": "field", "metric": "inp", "label": "INP (p75)", "threshold": 200, "comparator": "<=",
                "actual": 228, "status": "fail", "reason": "Over budget" }]
}
```

If `auditId` is given, it must belong to the same URL and strategy (otherwise `404`).

### `POST /api/budgets`

Request: `{ "url", "strategy", "source": "lab"|"field", "metric", "threshold": number }`. This is an upsert: there is one budget per
(url, strategy, source, metric).

- `201 { "budget": Budget }`
- `400 INVALID_INPUT` when the metric doesn't belong to the source, the threshold is out of range (score 0–100, CLS 0–10, times ≤ 600000 ms, non-negative), or the URL is invalid or private.
- `413` / `415` / `429` as in Conventions.

### `DELETE /api/budgets/:id`

Returns `204`, or `400 INVALID_ID` / `404 NOT_FOUND`.
