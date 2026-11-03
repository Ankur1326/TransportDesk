"use client";

import { useState } from "react";
import { formatInr } from "@/lib/ledger/format";
import { chartScale, compactInr } from "@/lib/dashboard/ui-helpers";
import type { FinancialTrendPoint, Financials, Widget } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const WIDTH = 800;
const HEIGHT = 220;
const LEFT = 58;
const RIGHT = 12;
const TOP = 12;
const BASELINE = 176;

function RevenueExpensesChart({ points, unit }: { points: FinancialTrendPoint[]; unit: "day" | "month" }) {
  const [selected, setSelected] = useState<number | null>(null);
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = BASELINE - TOP;
  const scale = chartScale(points.flatMap((point) => [point.revenue, point.expenses]), plotHeight);
  const slot = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.min(24, slot * 0.3);
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const selectedPoint = selected === null ? null : points[selected];

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-neutral-600 dark:text-neutral-300">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-brand-600" aria-hidden="true" />Revenue</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-neutral-400" aria-hidden="true" />Expenses</span>
      </div>
      {points.length ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`Revenue and expenses by ${unit}, with net profit available on each data point`}
          className="h-48 w-full"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3].map((step) => {
            const y = TOP + (plotHeight * step) / 3;
            const amount = scale.max * (1 - step / 3);
            return (
              <g key={step}>
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} stroke="currentColor" className="text-neutral-200 dark:text-brand-800" />
                <text x={LEFT - 8} y={y + 3} textAnchor="end" className="fill-neutral-500 text-[10px] dark:fill-neutral-400">{compactInr(amount)}</text>
              </g>
            );
          })}
          <line x1={LEFT} x2={WIDTH - RIGHT} y1={BASELINE} y2={BASELINE} stroke="currentColor" className="text-neutral-300 dark:text-brand-700" />
          {points.map((point, index) => {
            const center = LEFT + slot * (index + 0.5);
            const revenueHeight = scale.position(point.revenue);
            const expenseHeight = scale.position(point.expenses);
            const summary = `${point.label}: revenue ${formatInr(point.revenue)}, expenses ${formatInr(point.expenses)}, net profit ${point.netProfit < 0 ? "minus " : ""}${formatInr(Math.abs(point.netProfit))}`;
            return (
              <g key={point.key}>
                <rect
                  x={center - barWidth - 2}
                  y={BASELINE - revenueHeight}
                  width={barWidth}
                  height={Math.max(1, revenueHeight)}
                  fill="var(--color-brand-600)"
                  tabIndex={0}
                  role="button"
                  aria-label={summary}
                  onFocus={() => setSelected(index)}
                  onClick={() => setSelected(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelected(index);
                  }}
                >
                  <title>{summary}</title>
                </rect>
                <rect
                  x={center + 2}
                  y={BASELINE - expenseHeight}
                  width={barWidth}
                  height={Math.max(1, expenseHeight)}
                  fill="var(--color-neutral-400)"
                  tabIndex={0}
                  role="button"
                  aria-label={summary}
                  onFocus={() => setSelected(index)}
                  onClick={() => setSelected(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelected(index);
                  }}
                >
                  <title>{summary}</title>
                </rect>
                {(index % labelEvery === 0 || index === points.length - 1) && (
                  <text x={center} y={BASELINE + 20} textAnchor="middle" className="fill-neutral-500 text-[10px] dark:fill-neutral-400">{point.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="py-8 text-sm text-neutral-500 dark:text-neutral-400">No revenue or expense data for this period.</p>
      )}
      {selectedPoint && (
        <p aria-live="polite" className="min-h-5 text-xs text-neutral-600 dark:text-neutral-300">
          {selectedPoint.label} · Revenue {formatInr(selectedPoint.revenue)} · Expenses {formatInr(selectedPoint.expenses)} · Net profit {selectedPoint.netProfit < 0 ? "−" : ""}{formatInr(Math.abs(selectedPoint.netProfit))}
        </p>
      )}
      <table className="sr-only">
        <caption>Revenue, expenses and net profit by {unit}</caption>
        <thead><tr><th>Period</th><th>Revenue</th><th>Expenses</th><th>Net profit</th></tr></thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th>{point.label}</th><td>{formatInr(point.revenue)}</td><td>{formatInr(point.expenses)}</td>
              <td>{point.netProfit < 0 ? "−" : ""}{formatInr(Math.abs(point.netProfit))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrendsSection({
  financials,
  onRetry,
}: {
  financials: Widget<Financials>;
  onRetry: () => void;
}) {
  return (
    <DashboardPanel title="Revenue vs Expenses">
      {"error" in financials ? <WidgetUnavailable onRetry={onRetry} /> : <RevenueExpensesChart points={financials.trend} unit={financials.trendUnit} />}
    </DashboardPanel>
  );
}
