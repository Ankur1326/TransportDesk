"use client";

import Link from "next/link";
import { CalendarDays, RefreshCw } from "@/components/icons";
import { Button } from "@/components/Button";
import { Select } from "@/components/ui/Select";
import type { PeriodKey } from "@/lib/dashboard/periods";

export interface DashboardSelection {
  period: PeriodKey;
  from: string;
  to: string;
}

interface DashboardHeaderProps {
  selection: DashboardSelection;
  loading: boolean;
  onPeriodChange: (period: PeriodKey) => void;
  onDateChange: (field: "from" | "to", value: string) => void;
  onRefresh: () => void;
}

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "fy", label: "This financial year" },
  { value: "custom", label: "Custom range" },
];

export function DashboardHeader({
  selection,
  loading,
  onPeriodChange,
  onDateChange,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-brand-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="">
        <Select
          label="Period"
          aria-label="Dashboard period"
          value={selection.period}
          onChange={(event) => onPeriodChange(event.target.value as PeriodKey)}
          options={PERIOD_OPTIONS}
          size="compact"
        />
        {selection.period === "custom" && (
          <div className="flex gap-2">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300">
              From
              <span className="relative mt-1 block">
                <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <input
                  type="date"
                  aria-label="Custom period start date"
                  value={selection.from}
                  onChange={(event) => onDateChange("from", event.target.value)}
                  className="focus-ring h-9 rounded-md border border-neutral-300 bg-white pl-8 pr-2 text-sm text-neutral-900 dark:border-brand-700 dark:bg-brand-950 dark:text-neutral-100"
                />
              </span>
            </label>
            <label className="block text-xs text-neutral-600 dark:text-neutral-300">
              To
              <span className="relative mt-1 block">
                <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <input
                  type="date"
                  aria-label="Custom period end date"
                  value={selection.to}
                  onChange={(event) => onDateChange("to", event.target.value)}
                  className="focus-ring h-9 rounded-md border border-neutral-300 bg-white pl-8 pr-2 text-sm text-neutral-900 dark:border-brand-700 dark:bg-brand-950 dark:text-neutral-100"
                />
              </span>
            </label>
          </div>
        )}
      </div>
      {/* <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">Dashboard</h1> */}
      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} isLoading={loading} aria-label="Refresh dashboard">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Refresh</span>
        </Button>
        <Link href="/admin/consignment/new" className="focus-ring inline-flex h-9 items-center rounded-md bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">
          New Bilty
        </Link>
      </div>
    </header>
  );
}
