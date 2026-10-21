import { logger } from "../logger";

export type PsiStrategy = "mobile" | "desktop";

export class PsiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number | null, readonly retryable: boolean) {
    super(message);
  }
}

export type PsiClientOptions = {
  apiKey?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
};

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function classify(status: number, body: string): PsiError {
  let msg = `PSI HTTP ${status}`;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      const e = (parsed as { error?: { message?: unknown } }).error;
      if (e && typeof e.message === "string") msg = e.message.slice(0, 300);
    }
  } catch { /* non-JSON body */ }
  if (status === 429) {
    // Daily quota exhaustion will not recover within our backoff window; fail fast.
    const daily = /per day/i.test(msg);
    return new PsiError(msg, daily ? "PSI_DAILY_QUOTA" : "PSI_RATE_LIMITED", status, !daily);
  }
  if (status >= 500) return new PsiError(msg, "PSI_UPSTREAM", status, true);
  if (status === 403) return new PsiError(msg, "PSI_FORBIDDEN", status, false);
  return new PsiError(msg, "PSI_BAD_REQUEST", status, false);
}

/** Calls PSI v5 with per-attempt timeout and exponential backoff (with jitter) on transient errors. */
export async function runPagespeed(url: string, strategy: PsiStrategy, opts: PsiClientOptions = {}): Promise<unknown> {
  const { apiKey, timeoutMs = 120_000, maxAttempts = 4, baseDelayMs = 2_000, fetchImpl = fetch, sleep = defaultSleep, signal } = opts;
  const qs = new URLSearchParams({ url, strategy, category: "performance" });
  if (apiKey) qs.set("key", apiKey);
  const reqUrl = `${ENDPOINT}?${qs.toString()}`; // never logged (may contain key)

  let last: PsiError = new PsiError("PSI request not attempted", "PSI_UNKNOWN", null, false);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    try {
      const res = await fetchImpl(reqUrl, {
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
      const body = await res.text();
      if (res.ok) {
        let parsed: unknown;
        try { parsed = JSON.parse(body); } catch {
          throw new PsiError("PSI returned a non-JSON body", "PSI_BAD_RESPONSE", res.status, false);
        }
        logger.info("psi.success", { url, strategy, attempt, ms: Date.now() - started, keyed: Boolean(apiKey) });
        return parsed;
      }
      last = classify(res.status, body);
    } catch (err) {
      if (err instanceof PsiError) throw err;
      const name = err instanceof Error ? err.name : "Error";
      last = name === "TimeoutError" || name === "AbortError"
        ? new PsiError(`PSI request timed out after ${timeoutMs}ms`, "PSI_TIMEOUT", null, true)
        : new PsiError("Network error calling PSI", "PSI_NETWORK", null, true);
    }
    logger.warn("psi.attempt_failed", { url, strategy, attempt, code: last.code, status: last.status, retryable: last.retryable, ms: Date.now() - started });
    if (signal?.aborted || !last.retryable || attempt === maxAttempts) break;
    const delay = baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
    await sleep(delay);
  }
  throw last;
}
