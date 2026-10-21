import Link from "next/link";
import { CompareView } from "@/components/compare-view";

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const a = typeof sp.a === "string" ? sp.a : "", b = typeof sp.b === "string" ? sp.b : "";
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      {a && b ? <CompareView a={a} b={b} /> : <p className="text-muted-foreground">Provide ?a= and ?b= audit ids.</p>}
    </main>
  );
}
