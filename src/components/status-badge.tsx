import { Badge } from "@/components/ui/badge";
import type { AuditStatus } from "@/lib/types";

const STYLES: Record<AuditStatus, string> = {
  QUEUED: "border-transparent bg-muted text-muted-foreground",
  RUNNING: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  SUCCEEDED: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  FAILED: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
};

export function StatusBadge({ status }: { status: AuditStatus }) {
  return <Badge variant="outline" className={STYLES[status]} data-testid="status">{status.toLowerCase()}</Badge>;
}
