"use client";

import { ArrowDown, ArrowUp, Minus } from "@/components/icons";
import { formatInr } from "@/lib/ledger/format";
import { compactInr } from "@/lib/dashboard/ui-helpers";
import { isWidgetError, type Financials, type KpiValue, type PartySnapshot, type Widget } from "@/lib/dashboard/types";
import { WidgetUnavailable } from "./DashboardPrimitives";

function Change({
  metric,
  better,
  compareLabel,
}: {
  metric: KpiValue;
  better: "higher" | "lower";
  compareLabel: string;
}) {
  if (metric.previous === null) {
    return <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">No prior comparison</p>;
  }
  const direction = metric.value > metric.previous ? "up" : metric.value < metric.previous ? "down" : "flat";
  const improved = direction !== "flat" && ((direction === "up") === (better === "higher"));
  const worsened = direction !== "flat" && !improved;
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const color = improved
    ? "text-success-700 dark:text-success-300"
    : worsened
      ? "text-error-700 dark:text-error-300"
      : "text-neutral-500 dark:text-neutral-400";
  const change = metric.deltaPct === null
    ? "New"
    : direction === "flat"
      ? "No change"
      : `${direction === "up" ? "+" : "−"}${Math.abs(metric.deltaPct).toFixed(1)}%`;
  const cue = improved ? "improved" : worsened ? "worsened" : "unchanged";
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{change} vs {compareLabel}</span>
      <span className="sr-only">, {cue}</span>
    </p>
  );
}

function Stat({
  label,
  amount,
  metric,
  better = "higher",
  compareLabel,
  negative = false,
  hint,
  children,
}: {
  label: string;
  amount: number;
  metric?: KpiValue;
  better?: "higher" | "lower";
  compareLabel: string;
  negative?: boolean;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-neutral-200 px-3 py-2 first:pl-0 dark:border-brand-800 sm:border-l sm:py-0 sm:first:border-0">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p
        title={`${amount < 0 ? "−" : ""}${formatInr(Math.abs(amount))}${hint ? ` · ${hint}` : ""}`}
        className={`mt-1 truncate text-xl font-semibold tabular-nums tracking-tight ${negative ? "text-error-700 dark:text-error-300" : "text-neutral-950 dark:text-white"}`}
      >
        {compactInr(amount)}
      </p>
      {metric && <Change metric={metric} better={better} compareLabel={compareLabel} />}
      {children}
    </div>
  );
}

function SnapshotValue({ value, onRetry }: { value: Widget<PartySnapshot>; onRetry: () => void }) {
  if (isWidgetError(value)) {
    return <WidgetUnavailable onRetry={onRetry} />;
  }
  return <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white" title={formatInr(value.total)}>{compactInr(value.total)}</p>;
}

export function FinancialsSection({
  financials,
  receivables,
  payables,
  compareLabel,
  onRetry,
}: {
  financials: Widget<Financials>;
  receivables: Widget<PartySnapshot>;
  payables: Widget<PartySnapshot>;
  compareLabel: string;
  onRetry: () => void;
}) {
  if (isWidgetError(financials)) return <WidgetUnavailable onRetry={onRetry} />;
  return (
    <section aria-label="Financial summary" className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
      <Stat label="Revenue" amount={financials.revenue.value} metric={financials.revenue} compareLabel={compareLabel} hint="Taxable billed value before GST" />
      <Stat label="Expenses" amount={financials.expenses.total.value} metric={financials.expenses.total} better="lower" compareLabel={compareLabel} hint="Recorded lorry hire cost, excluding GST and TDS" />
      <Stat
        label="Net profit"
        amount={financials.netProfit.value}
        metric={financials.netProfit}
        compareLabel={compareLabel}
        negative={financials.netProfit.value < 0}
        hint="Revenue minus expenses. Gross margin is a separate trip-linked measure."
      >
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {financials.marginPct === null ? "Margin unavailable" : `${financials.marginPct}% margin`}
        </p>
      </Stat>
      <div className="min-w-0 border-neutral-200 px-3 py-2 first:border-0 first:pl-0 dark:border-brand-800 sm:border-l sm:py-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Outstanding · as of now</p>
        <SnapshotValue value={receivables} onRetry={onRetry} />
        {isWidgetError(payables) ? (
          <WidgetUnavailable onRetry={onRetry} />
        ) : (
          <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400" title={`Payable ${formatInr(payables.total)}`}>
            Payable {compactInr(payables.total)}
          </p>
        )}
      </div>
    </section>
  );
}
