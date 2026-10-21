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
  it("does not retry 400 or daily quota", async () => {
    let n = 0;
    const fetchImpl = (async () => { n++; return new Response('{"error":{"message":"Quota exceeded ... per day"}}', { status: 429 }); }) as typeof fetch;
    await expect(runPagespeed("https://a.example", "mobile", { fetchImpl, sleep: noSleep })).rejects.toBeInstanceOf(PsiError);
    expect(n).toBe(1);
  });
});
