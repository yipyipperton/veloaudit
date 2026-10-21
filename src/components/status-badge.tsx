import type { AuditStatus } from "@/lib/types";

const STYLES: Record<AuditStatus, { cls: string; dot: string }> = {
  QUEUED: { cls: "text-muted-foreground ring-border", dot: "bg-muted-foreground/60" },
  RUNNING: { cls: "text-sky-700 ring-sky-500/25 dark:text-sky-300", dot: "bg-sky-500 animate-pulse" },
  SUCCEEDED: { cls: "text-emerald-700 ring-emerald-500/25 dark:text-emerald-300", dot: "bg-emerald-500" },
  FAILED: { cls: "text-rose-700 ring-rose-500/25 dark:text-rose-300", dot: "bg-rose-500" },
};

export function StatusBadge({ status }: { status: AuditStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.cls}`} data-testid="status">
      <span className={`size-1.5 rounded-full ${s.dot}`} />{status.toLowerCase()}
    </span>
  );
}
