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
      if (!res.ok) {
        const msg = (data as { error?: { message?: string } }).error?.message ?? "Request failed";
        setError(msg); return;
      }
      const id = (data as { audit: { id: string } }).audit.id;
      router.push(`/audits/${id}`);
    } catch {
      setError("Network error");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input aria-label="URL" name="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} required className="sm:flex-1" />
      <div className="flex gap-1" role="radiogroup" aria-label="Strategy">
        {(["mobile", "desktop"] as const).map((s) => (
          <Button key={s} type="button" role="radio" aria-checked={strategy === s} variant={strategy === s ? "default" : "outline"} onClick={() => setStrategy(s)}>
            {s === "mobile" ? "Mobile" : "Desktop"}
          </Button>
        ))}
      </div>
      <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Run audit"}</Button>
      {error && <p role="alert" className="text-sm text-red-600 sm:basis-full">{error}</p>}
    </form>
  );
}
