import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HistoryView } from "@/components/history-view";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const url = typeof sp.url === "string" ? sp.url : "";
  const strategy = sp.strategy === "desktop" ? "desktop" : "mobile";
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Dashboard</Link>
      {url ? <HistoryView key={`${url}|${strategy}`} url={url} strategy={strategy} /> : <p className="text-muted-foreground">Provide ?url= and ?strategy=.</p>}
    </main>
  );
}
