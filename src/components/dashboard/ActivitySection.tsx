"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, FileText, Package, Truck } from "@/components/icons";
import type { ActivityItem } from "@/lib/dashboard/types";
import { formatIstDate, relativeTime } from "@/lib/dashboard/ui-helpers";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const ACTIVITY_ICON = {
  lr: Package,
  bill: FileText,
  payment: CreditCard,
  lhc: Truck,
} as const;

export function ActivitySection({
  activity,
  onRetry,
}: {
  activity: ActivityItem[] | { error: true };
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <DashboardPanel title="Recent activity" subtitle="Latest bookings, bills, payments and contracts">
      {"error" in activity ? <WidgetUnavailable onRetry={onRetry} /> : activity.length ? (
        <ol className="divide-y divide-neutral-100 dark:divide-brand-800">
          {activity.slice(0, 10).map((item) => {
            const Icon = ACTIVITY_ICON[item.type];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="focus-ring flex min-h-14 items-center gap-3 rounded px-1 py-2 hover:bg-neutral-50 dark:hover:bg-brand-800/50"
                  title={formatIstDate(item.at, true)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-brand-800 dark:text-neutral-300">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-100">{item.text}</span>
                  <time dateTime={item.at} className="shrink-0 text-[11px] text-neutral-500 dark:text-neutral-400">{relativeTime(item.at, now)}</time>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No recent activity yet.</p>}
    </DashboardPanel>
  );
}
