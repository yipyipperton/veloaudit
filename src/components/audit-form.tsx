"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2, Monitor, Smartphone } from "lucide-react";

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/audits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, strategy }) });
      const data: unknown = await res.json();
      if (!res.ok) { setError((data as { error?: { message?: string } }).error?.message ?? "Request failed"); setBusy(false); return; }
      router.push(`/audits/${(data as { audit: { id: string } }).audit.id}`);
    } catch {
      setError("Network error"); setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="glow-ring flex flex-col gap-2 rounded-2xl bg-surface p-2 transition-shadow focus-within:shadow-[0_0_0_1px_var(--brand),0_12px_48px_-12px_oklch(0.56_0.22_277/45%)] sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-3 px-3">
          <Globe className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
          <input aria-label="URL" name="url" type="text" inputMode="url" autoComplete="off" spellCheck={false} required
            placeholder="https://your-site.com" value={url} onChange={(e) => setUrl(e.target.value)}
            className="h-12 w-full bg-transparent text-[15px] tracking-tight outline-none placeholder:text-muted-foreground/70" />
        </label>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted p-1" role="radiogroup" aria-label="Strategy">
            {(["mobile", "desktop"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={strategy === s} onClick={() => setStrategy(s)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all ${strategy === s ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "mobile" ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
                {s === "mobile" ? "Mobile" : "Desktop"}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy}
            className="group flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-[14px] font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70 sm:flex-none">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? "Starting…" : "Run audit"}
            {!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="fade-up mt-3 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
