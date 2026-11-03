"use client";

import { ArrowDown, ArrowUp, Minus } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { formatInr } from "@/lib/ledger/format";
import { compactInr } from "@/lib/dashboard/ui-helpers";
import { isWidgetError, type Financials, type KpiValue, type Widget } from "@/lib/dashboard/types";
import { WidgetUnavailable } from "./DashboardPrimitives";

type MetricName = "revenue" | "expenses" | "netProfit";

const metricDetails: Record<MetricName, { label: string; better: "higher" | "lower"; hint: string }> = {
  revenue: {
    label: "Total Revenue",
    better: "higher",
    hint: "Taxable bill value: item charges minus discount, before GST. TDS, advances and round-off do not change revenue.",
  },
  expenses: {
    label: "Total Expenses",
    better: "lower",
    hint: "Recorded lorry hire cost before GST and TDS. Other expense categories are not currently tracked.",
  },
  netProfit: {
    label: "Net Profit",
    better: "higher",
    hint: "Period revenue minus recorded expenses. This accounting measure is distinct from trip-linked gross margin.",
  },
};

function Delta({ metric, better }: { metric: KpiValue; better: "higher" | "lower" }) {
  const previous = metric.previous;
  if (previous == null) return <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Comparison unavailable</p>;

  const direction = metric.value > previous ? "up" : metric.value < previous ? "down" : "flat";
  const positive = direction !== "flat" && ((direction === "up") === (better === "higher"));
  const negative = direction !== "flat" && !positive;
  const color = positive
    ? "text-success-700 dark:text-success-300"
    : negative
      ? "text-error-700 dark:text-error-300"
      : "text-neutral-500 dark:text-neutral-400";
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const text = metric.deltaPct == null
    ? direction === "flat" ? "No change vs previous period" : "New vs previous period"
    : `${Math.abs(metric.deltaPct).toFixed(1)}% vs previous period`;

  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{text}</span>
      <span className="sr-only">{positive ? "Improved" : negative ? "Worsened" : "Unchanged"}</span>
    </p>
  );
}

function FinancialCard({
  name,
  financials,
  periodLabel,
}: {
  name: MetricName;
  financials: Financials;
  periodLabel: string;
}) {
  const detail = metricDetails[name];
  const metric = name === "expenses" ? financials.expenses.total : financials[name];
  const value = metric.value;
  const negativeProfit = name === "netProfit" && value < 0;

  return (
    <Card className="min-w-0 rounded-2xl border-neutral-200 bg-white p-4 shadow-sm dark:border-brand-800 dark:bg-brand-900 sm:p-5">
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 text-sm font-semibold text-neutral-700 dark:text-neutral-200">{detail.label}</h2>
        <span
          tabIndex={0}
          title={detail.hint}
          aria-label={`${detail.label} information: ${detail.hint}`}
          className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-neutral-300 text-[11px] font-bold text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 dark:border-brand-700 dark:text-neutral-300"
        >
          i
        </span>
      </div>
      <p
        title={`${value < 0 ? "−" : ""}${formatInr(value)}`}
        className={`mt-3 truncate text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${negativeProfit ? "text-error-700 dark:text-error-300" : "text-neutral-950 dark:text-white"}`}
      >
        {compactInr(value)}
      </p>
      {name === "expenses" ? (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-xs dark:border-brand-800">
          {financials.expenses.breakdown.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-2">
              <span className="truncate text-neutral-600 dark:text-neutral-300">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-neutral-800 dark:text-neutral-100">
                {item.amount == null ? "Not tracked" : formatInr(item.amount)}
              </span>
            </li>
          ))}
          {financials.expenses.breakdown.some((item) => item.key === "other" && item.amount == null) && (
            <li className="pt-1 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
              Trip expenses (fuel, toll, etc.) are not tracked yet
            </li>
          )}
        </ul>
      ) : name === "netProfit" ? (
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
          {financials.marginPct == null ? "Margin unavailable" : `${financials.marginPct}% margin`}
        </p>
      ) : null}
      <Delta metric={metric} better={detail.better} />
      <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{periodLabel}</p>
    </Card>
  );
}

export function FinancialsSection({
  financials,
  periodLabel,
  onRetry,
}: {
  financials: Widget<Financials> | null | undefined;
  periodLabel: string;
  onRetry: () => void;
}) {
  if (!financials || isWidgetError(financials)) return <WidgetUnavailable onRetry={onRetry} />;
  return (
    <section aria-label="Period financials" className="grid min-w-0 gap-3 sm:grid-cols-3">
      {(["revenue", "expenses", "netProfit"] as const).map((name) => (
        <FinancialCard key={name} name={name} financials={financials} periodLabel={periodLabel} />
      ))}
    </section>
  );
}
