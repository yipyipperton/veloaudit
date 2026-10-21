import Link from "next/link";
import { AuditDetail } from "@/components/audit-detail";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      <AuditDetail id={id} />
    </main>
  );
}
