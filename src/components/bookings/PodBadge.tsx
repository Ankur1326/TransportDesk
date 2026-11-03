import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  getPodStatus, podAgeLabel, podAgeLevel, type PodAgeLevel, type PodStatus,
} from "@/lib/pod-status";

const VARIANT: Record<PodStatus, "warning" | "info" | "success"> = {
  Pending: "warning",
  Received: "info",
  Submitted: "success",
};

/** POD pill for a Delivered LR. Renders nothing for LRs that haven't been delivered (POD isn't due yet). */
export function PodBadge({ item, className }: { item: { status?: string; podStatus?: unknown }; className?: string }) {
  if (item.status !== "Delivered") return null;
  const pod = getPodStatus(item);
  return <Badge variant={VARIANT[pod]} className={className}>POD {pod}</Badge>;
}

const AGE_CLS: Record<PodAgeLevel, string> = {
  fresh: "bg-neutral-100 text-neutral-700",
  aging: "bg-warning-50 text-warning-700",
  overdue: "bg-error-50 text-error-700",
};

/** "Waiting 9 days" chip for a Delivered LR whose POD is still Pending; hidden when the age is unknown. */
export function PodAgeing({ days, className }: { days?: number | null; className?: string }) {
  if (typeof days !== "number") return null;
  const level = podAgeLevel(days);
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold", AGE_CLS[level], className)}
      title={`Delivered ${podAgeLabel(days)} ago, POD not received`}
    >
      {level === "overdue" ? "Overdue · " : ""}Waiting {podAgeLabel(days)}
    </span>
  );
}
