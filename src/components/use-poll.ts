"use client";
import { useEffect, useState } from "react";

/** Polls a JSON endpoint while `shouldContinue(data)` is true. */
export function usePoll<T>(url: string, intervalMs: number, shouldContinue: (d: T) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as T & { error?: { message?: string } };
        if (!res.ok) { setError(json.error?.message ?? "Request failed"); return; }
        if (stop) return;
        setData(json); setError(null);
        if (shouldContinue(json)) timer = setTimeout(tick, intervalMs);
      } catch {
        setError("Network error");
        if (!stop) timer = setTimeout(tick, intervalMs * 2);
      }
    };
    void tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs]);
  return { data, error };
}
