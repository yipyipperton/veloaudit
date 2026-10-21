"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Polls a JSON endpoint while `shouldContinue(data)` is true. `reload()` forces a refetch. */
export function usePoll<T>(url: string, intervalMs: number, shouldContinue: (d: T) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const cont = useRef(shouldContinue);
  cont.current = shouldContinue;
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as T & { error?: { message?: string } };
        if (stop) return;
        if (!res.ok) { setError(json.error?.message ?? "Request failed"); return; }
        setData(json); setError(null);
        if (intervalMs > 0 && cont.current(json)) timer = setTimeout(tick, intervalMs);
      } catch {
        if (stop) return;
        setError("Network error");
        if (intervalMs > 0) timer = setTimeout(tick, intervalMs * 2);
      }
    };
    void tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [url, intervalMs, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, reload };
}
