import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompareView } from "@/components/compare-view";

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const a = typeof sp.a === "string" ? sp.a : "", b = typeof sp.b === "string" ? sp.b : "";
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Dashboard</Link>
      {a && b ? <CompareView a={a} b={b} /> : <p className="text-muted-foreground">Provide ?a= and ?b= audit ids.</p>}
    </main>
  );
}
