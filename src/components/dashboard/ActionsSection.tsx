import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  Truck,
  Wallet,
} from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import type { ActionCentre } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const ACTION_ICONS = {
  eway: Shield,
  "overdue-bills": Wallet,
  documents: FileText,
  "late-trips": Truck,
  "supplier-dues": Wallet,
  "pod-pending": Clock,
  "ready-to-bill": CheckCircle2,
} as const;

const URGENCY: Record<string, { variant: "error" | "warning" | "info"; label: string; cue: string }> = {
  critical: { variant: "error", label: "Urgent", cue: "Act now" },
  high: { variant: "warning", label: "High", cue: "Needs attention" },
  medium: { variant: "info", label: "Medium", cue: "Keep an eye on this" },
};

export function ActionsSection({
  actions,
  onRetry,
}: {
  actions: ActionCentre | { error: true };
  onRetry: () => void;
}) {
  return (
    <DashboardPanel title="Needs attention" subtitle="Prioritized actions that may need your follow-up">
      {"error" in actions ? (
        <WidgetUnavailable onRetry={onRetry} />
      ) : actions.items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.items.map((item) => {
            const Icon = ACTION_ICONS[item.id];
            const urgency = URGENCY[item.urgency];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="focus-ring flex h-full min-h-24 items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition hover:border-neutral-300 hover:bg-white dark:border-brand-800 dark:bg-brand-950 dark:hover:bg-brand-800"
                >
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.urgency === "critical" ? "bg-error-100 text-error-700 dark:bg-error-950 dark:text-error-300" : item.urgency === "high" ? "bg-warning-100 text-warning-800 dark:bg-warning-950 dark:text-warning-200" : "bg-info-100 text-info-700 dark:bg-info-950 dark:text-info-300"}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                      <Badge variant={urgency.variant}>{urgency.label}</Badge>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-600 dark:text-neutral-300">{item.description}</span>
                    <span className="sr-only">{urgency.cue}; {item.count} items.</span>
                  </span>
                  <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-white px-2 text-xs font-bold tabular-nums text-neutral-800 ring-1 ring-neutral-200 dark:bg-brand-900 dark:text-neutral-100 dark:ring-brand-700">
                    {item.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : actions.unavailable.length ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <AlertTriangle className="h-4 w-4 text-warning-600" aria-hidden="true" />
            No current actions; some checks could not run.
          </p>
          <WidgetUnavailable onRetry={onRetry} />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-5 text-sm font-medium text-success-800 dark:bg-success-950/40 dark:text-success-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          All caught up — nothing needs attention right now.
        </div>
      )}
      {!("error" in actions) && actions.unavailable.length > 0 && actions.items.length > 0 && (
        <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">Some checks are temporarily unavailable.</p>
      )}
    </DashboardPanel>
  );
}
