import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RunResults } from "@/components/results-view";

export default async function RunPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-5 py-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Dashboard</Link>
      <RunResults id={id} initialTab={typeof sp.tab === "string" ? sp.tab : undefined} />
    </main>
  );
}
