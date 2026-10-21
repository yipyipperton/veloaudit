import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuditResults } from "@/components/results-view";
import { AuditIdSchema } from "@/server/validation/schemas";
import { getAudit } from "@/server/persistence/audits";

export const dynamic = "force-dynamic";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Audits that belong to a run open in the run's tabbed view, on this device's tab.
  const audit = AuditIdSchema.safeParse(id).success ? await getAudit(id).catch(() => null) : null;
  if (audit?.runId) redirect(`/runs/${audit.runId}?tab=${audit.strategy === "MOBILE" ? "mobile" : "desktop"}`);
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-5 py-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5" /> Dashboard</Link>
      <AuditResults id={id} />
    </main>
  );
}
