"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      if (!res.ok) { setError((data as { error?: { message?: string } }).error?.message ?? "Request failed"); return; }
      router.push(`/audits/${(data as { audit: { id: string } }).audit.id}`);
    } catch {
      setError("Network error");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input aria-label="URL" name="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} required className="h-10 font-mono text-sm sm:flex-1" />
      <div className="inline-flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Strategy">
        {(["mobile", "desktop"] as const).map((s) => (
          <Button key={s} type="button" size="sm" role="radio" aria-checked={strategy === s} variant={strategy === s ? "secondary" : "ghost"} onClick={() => setStrategy(s)}>
            {s === "mobile" ? "Mobile" : "Desktop"}
          </Button>
        ))}
      </div>
      <Button type="submit" disabled={busy} className="h-10">{busy ? "Submitting…" : "Run audit"}</Button>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 sm:basis-full">{error}</p>}
    </form>
  );
}
