import Link from "next/link";
import { HistoryView } from "@/components/history-view";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const url = typeof sp.url === "string" ? sp.url : "";
  const strategy = sp.strategy === "desktop" ? "desktop" : "mobile";
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      {url ? <HistoryView key={`${url}|${strategy}`} url={url} strategy={strategy} /> : <p className="text-muted-foreground">Provide ?url= and ?strategy=.</p>}
    </main>
  );
}
