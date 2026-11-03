"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, RefreshCw } from "@/components/icons";
import { Button } from "@/components/Button";
import { Select } from "@/components/ui/Select";
import type { PeriodKey } from "@/lib/dashboard/periods";
import { greeting } from "@/lib/dashboard/ui-helpers";

export interface DashboardSelection {
  period: PeriodKey;
  from: string;
  to: string;
}

interface DashboardHeaderProps {
  companyName: string | null;
  selection: DashboardSelection;
  generatedAt?: string;
  loading: boolean;
  onPeriodChange: (period: PeriodKey) => void;
  onDateChange: (field: "from" | "to", value: string) => void;
  onRefresh: () => void;
}

const QUICK_ACTIONS = [
  { href: "/admin/consignment/new", label: "New Bilty", icon: "＋" },
  { href: "/admin/billing/new", label: "New Bill", icon: "▤" },
  { href: "/admin/lorry-hire/new", label: "New Contract", icon: "↗" },
  { href: "/admin/customers", label: "Record Payment", icon: "₹" },
];

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "fy", label: "This financial year" },
  { value: "custom", label: "Custom range" },
];

export function DashboardHeader({
  companyName,
  selection,
  generatedAt,
  loading,
  onPeriodChange,
  onDateChange,
  onRefresh,
}: DashboardHeaderProps) {
  const updated = generatedAt
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(generatedAt))
    : null;

  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-accent-700 dark:text-accent-300">
            {greeting(new Date())}{companyName ? `, ${companyName}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Your transport business at a glance
          </p>
        </div>
        <nav aria-label="Quick actions" className="hidden flex-wrap gap-2 xl:flex">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-accent-300 hover:bg-accent-50 dark:border-brand-700 dark:bg-brand-900 dark:text-neutral-100 dark:hover:bg-brand-800"
            >
              <span aria-hidden="true" className="text-accent-700 dark:text-accent-300">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-brand-800 dark:bg-brand-900 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(180px,0.8fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
          <Select
            label="Period"
            aria-label="Dashboard period"
            value={selection.period}
            onChange={(event) => onPeriodChange(event.target.value as PeriodKey)}
            options={PERIOD_OPTIONS}
            size="compact"
          />
          {selection.period === "custom" && (
            <>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                From
                <span className="relative mt-1 block">
                  <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                  <input
                    type="date"
                    aria-label="Custom period start date"
                    value={selection.from}
                    onChange={(event) => onDateChange("from", event.target.value)}
                    className="focus-ring h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-2 text-sm text-neutral-900 dark:border-brand-700 dark:bg-brand-950 dark:text-neutral-100"
                  />
                </span>
              </label>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                To
                <span className="relative mt-1 block">
                  <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                  <input
                    type="date"
                    aria-label="Custom period end date"
                    value={selection.to}
                    onChange={(event) => onDateChange("to", event.target.value)}
                    className="focus-ring h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-2 text-sm text-neutral-900 dark:border-brand-700 dark:bg-brand-950 dark:text-neutral-100"
                  />
                </span>
              </label>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
            {updated ? `Last updated ${updated}` : "Not updated yet"}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} isLoading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 xl:hidden">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="focus-ring flex min-h-11 items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 dark:border-brand-800 dark:bg-brand-900 dark:text-neutral-100"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="text-accent-700 dark:text-accent-300">{action.icon}</span>
              {action.label}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </header>
  );
}
