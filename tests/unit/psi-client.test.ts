import { describe, expect, it } from "vitest";
import { runPagespeed, PsiError } from "@/server/psi/client";

const noSleep = async () => {};
describe("runPagespeed retry", () => {
  it("retries transient 503 then succeeds", async () => {
    let n = 0;
    const fetchImpl = (async () => (++n < 3 ? new Response("{}", { status: 503 }) : new Response('{"ok":1}', { status: 200 }))) as typeof fetch;
    await expect(runPagespeed("https://a.example", "mobile", { fetchImpl, sleep: noSleep })).resolves.toEqual({ ok: 1 });
    expect(n).toBe(3);
  });
  it("does not retry daily quota", async () => {
    let n = 0;
    const fetchImpl = (async () => { n++; return new Response('{"error":{"message":"Quota exceeded ... per day"}}', { status: 429 }); }) as typeof fetch;
    await expect(runPagespeed("https://a.example", "mobile", { fetchImpl, sleep: noSleep })).rejects.toMatchObject({ code: "PSI_DAILY_QUOTA" });
    expect(n).toBe(1);
  });
  it("non-JSON 200 body fails fast as PSI_BAD_RESPONSE", async () => {
    let n = 0;
    const fetchImpl = (async () => { n++; return new Response("<html>", { status: 200 }); }) as typeof fetch;
    await expect(runPagespeed("https://a.example", "mobile", { fetchImpl, sleep: noSleep })).rejects.toBeInstanceOf(PsiError);
    expect(n).toBe(1);
  });
  it("uses exponential backoff delays", async () => {
    const delays: number[] = [];
    const fetchImpl = (async () => new Response("{}", { status: 500 })) as typeof fetch;
    await expect(runPagespeed("https://a.example", "mobile", { fetchImpl, baseDelayMs: 100, maxAttempts: 4, sleep: async (ms) => { delays.push(ms); } })).rejects.toMatchObject({ code: "PSI_UPSTREAM" });
    expect(delays).toHaveLength(3);
    delays.forEach((d, i) => { expect(d).toBeGreaterThanOrEqual(100 * 2 ** i); expect(d).toBeLessThan(100 * 2 ** i + 500); });
  });
});
