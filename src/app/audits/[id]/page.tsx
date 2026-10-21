import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditDetail } from "@/components/audit-detail";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Dashboard</Link>
      <AuditDetail id={id} />
    </main>
  );
}
