import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import type { ActionCentre, ActionUrgency, Widget } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const URGENCY_LABEL: Record<ActionUrgency, string> = {
  critical: "Urgent",
  high: "Needs attention",
  medium: "Monitor",
};

const URGENCY_COLOR: Record<ActionUrgency, string> = {
  critical: "text-error-700 dark:text-error-300",
  high: "text-warning-800 dark:text-warning-200",
  medium: "text-neutral-500 dark:text-neutral-400",
};

export function ActionsSection({
  actions,
  onRetry,
}: {
  actions: Widget<ActionCentre>;
  onRetry: () => void;
}) {
  return (
    <DashboardPanel title="Needs attention">
      {("error" in actions) ? (
        <WidgetUnavailable onRetry={onRetry} />
      ) : actions.items.length ? (
        <ul className="divide-y divide-neutral-200 dark:divide-brand-800">
          {actions.items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="focus-ring flex min-h-10 items-center gap-3 rounded-sm py-2 text-sm hover:bg-neutral-50 dark:hover:bg-brand-950">
                <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-neutral-950 dark:text-white">{item.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{item.title}</span>
                  <span className="text-neutral-500 dark:text-neutral-400"> — {item.description}</span>
                  <span className={`ml-2 whitespace-nowrap text-[10px] ${URGENCY_COLOR[item.urgency]}`}>{URGENCY_LABEL[item.urgency]}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : actions.unavailable.length ? (
        <WidgetUnavailable onRetry={onRetry} />
      ) : (
        <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400">Nothing pending.</p>
      )}
    </DashboardPanel>
  );
}
