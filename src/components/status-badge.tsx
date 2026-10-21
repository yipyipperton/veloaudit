import { Badge } from "@/components/ui/badge";
import type { AuditView } from "./types";

export function StatusBadge({ status }: { status: AuditView["status"] }) {
  const variant = status === "FAILED" ? "destructive" : status === "SUCCEEDED" ? "default" : "secondary";
  return <Badge variant={variant} data-testid="status">{status.toLowerCase()}</Badge>;
}
