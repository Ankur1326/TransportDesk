"use client";

import Link from "next/link";
import { useState } from "react";
import { formatInr } from "@/lib/ledger/format";
import { chartScale, compactInr } from "@/lib/dashboard/ui-helpers";
import type { FinancialTrendPoint, Trends } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const WIDTH = 560;
const HEIGHT = 170;
const CHART_TOP = 12;
const CHART_HEIGHT = 112;
const CHART_BOTTOM = 140;

function signedInr(value: number) {
  return `${value < 0 ? "−" : ""}${formatInr(value)}`;
}

function RevenueCostChart({ trends }: { trends: Trends }) {
  const [selected, setSelected] = useState<number | null>(null);
  const points = trends.revenueVsCost;
  const scale = chartScale(points.flatMap((point) => [point.revenue, point.cost]), CHART_HEIGHT);
  const slot = WIDTH / Math.max(points.length, 1);
  const barWidth = Math.min(20, slot * 0.28);
  const selectedPoint = selected == null ? null : points[selected];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-neutral-600 dark:text-neutral-300">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-600" aria-hidden="true" />Taxable revenue</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-accent-500" aria-hidden="true" />Hire cost</span>
      </div>
      {points.length ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Grouped bar chart comparing monthly taxable revenue with lorry hire cost"
          className="h-44 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line x1="0" x2={WIDTH} y1={CHART_BOTTOM} y2={CHART_BOTTOM} stroke="currentColor" className="text-neutral-200 dark:text-brand-700" />
          {points.map((point, index) => {
            const center = slot * (index + 0.5);
            const revenueHeight = scale.position(point.revenue);
            const costHeight = scale.position(point.cost);
            const revenueX = center - barWidth - 2;
            const costX = center + 2;
            const label = `${point.label}: revenue ${formatInr(point.revenue)}, hire cost ${formatInr(point.cost)}`;
            return (
              <g key={point.key} onClick={() => setSelected(index)} className="cursor-pointer">
                <rect
                  x={revenueX}
                  y={CHART_BOTTOM - revenueHeight}
                  width={barWidth}
                  height={Math.max(1, revenueHeight)}
                  rx="3"
                  fill="var(--color-brand-600, #1d4ed8)"
                  tabIndex={0}
                  aria-label={label}
                  onFocus={() => setSelected(index)}
                >
                  <title>{label}</title>
                </rect>
                <rect
                  x={costX}
                  y={CHART_BOTTOM - costHeight}
                  width={barWidth}
                  height={Math.max(1, costHeight)}
                  rx="3"
                  fill="var(--color-accent-500, #f97316)"
                  tabIndex={0}
                  aria-label={label}
                  onFocus={() => setSelected(index)}
                >
                  <title>{label}</title>
                </rect>
                <text x={center} y={CHART_BOTTOM + 19} textAnchor="middle" className="fill-neutral-500 text-[10px] dark:fill-neutral-400">{point.label}</text>
              </g>
            );
          })}
          <text x="0" y={CHART_TOP} className="fill-neutral-400 text-[9px]">{compactInr(scale.max)}</text>
        </svg>
      ) : <p className="py-8 text-center text-xs text-neutral-500">No billed freight data for this period.</p>}
      {selectedPoint && (
        <p aria-live="polite" className="mt-1 text-center text-xs text-neutral-600 dark:text-neutral-300">
        {selectedPoint.label} · Revenue {formatInr(selectedPoint.revenue)} · Hire {formatInr(selectedPoint.cost)}
        </p>
      )}
      <table className="sr-only">
        <caption>Monthly taxable revenue and hire cost</caption>
        <thead><tr><th>Month</th><th>Taxable revenue</th><th>Hire cost</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.key}><th>{point.label}</th><td>{formatInr(point.revenue)}</td><td>{formatInr(point.cost)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function FinancialTrendChart({ points }: { points: FinancialTrendPoint[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const baseline = 96;
  const chartHeight = 62;
  const maxMagnitude = Math.max(1, ...points.flatMap((point) => [point.revenue, point.expenses, Math.abs(point.netProfit)]));
  const slot = WIDTH / Math.max(points.length, 1);
  const barWidth = Math.min(14, slot * 0.18);
  const selectedPoint = selected == null ? null : points[selected];
  const series = [
    { key: "revenue", label: "Revenue", color: "var(--color-brand-600, #2563eb)" },
    { key: "expenses", label: "Expenses", color: "var(--color-accent-500, #f97316)" },
    { key: "netProfit", label: "Net profit", color: "var(--color-success-600, #16a34a)" },
  ] as const;
  const geometry = (value: number) => {
    const height = Math.abs(value / maxMagnitude) * chartHeight;
    return { y: value >= 0 ? baseline - height : baseline, height: Math.max(1, height) };
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-neutral-600 dark:text-neutral-300">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      {points.length ? (
        <svg
          viewBox={`0 0 ${WIDTH} 178`}
          role="img"
          aria-label="Grouped monthly chart of taxable revenue, recorded expenses and net profit for the selected period"
          className="h-44 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line x1="0" x2={WIDTH} y1={baseline} y2={baseline} stroke="currentColor" className="text-neutral-300 dark:text-brand-700" />
          {points.map((point, index) => {
            const values = [point.revenue, point.expenses, point.netProfit];
            const center = slot * (index + 0.5);
            const groupWidth = barWidth * 3 + 4;
            const start = center - groupWidth / 2;
            const summary = `${point.label}: revenue ${formatInr(point.revenue)}, expenses ${formatInr(point.expenses)}, net profit ${signedInr(point.netProfit)}`;
            return (
              <g key={point.key} onClick={() => setSelected(index)} className="cursor-pointer">
                {series.map((item, seriesIndex) => {
                  const value = values[seriesIndex];
                  const { y, height } = geometry(value);
                  return (
                    <rect
                      key={item.key}
                      x={start + seriesIndex * (barWidth + 2)}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx="2"
                      fill={item.color}
                      tabIndex={0}
                      aria-label={`${point.label}: ${item.label} ${item.key === "netProfit" ? signedInr(value) : formatInr(value)}`}
                      onFocus={() => setSelected(index)}
                    >
                      <title>{summary}</title>
                    </rect>
                  );
                })}
                <text x={center} y="174" textAnchor="middle" className="fill-neutral-500 text-[10px] dark:fill-neutral-400">{point.label}</text>
              </g>
            );
          })}
          <text x="0" y="12" className="fill-neutral-400 text-[9px]">{compactInr(maxMagnitude)}</text>
          <text x="0" y="171" className="fill-neutral-400 text-[9px]">0</text>
        </svg>
      ) : <p className="py-8 text-center text-xs text-neutral-500">No financial data for this period.</p>}
      {selectedPoint && (
        <p aria-live="polite" className="mt-1 text-center text-xs text-neutral-600 dark:text-neutral-300">
          {selectedPoint.label} · Revenue {formatInr(selectedPoint.revenue)} · Expenses {formatInr(selectedPoint.expenses)} · Net profit {signedInr(selectedPoint.netProfit)}
        </p>
      )}
      <table className="sr-only">
        <caption>Revenue, expenses and net profit by month in the selected period</caption>
        <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net profit</th></tr></thead>
        <tbody>{points.map((point) => (
          <tr key={point.key}>
            <th>{point.label}</th><td>{formatInr(point.revenue)}</td><td>{formatInr(point.expenses)}</td><td>{signedInr(point.netProfit)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function RankBars({
  title,
  rows,
  valueLabel,
  formatValue,
  hrefForRow,
  ariaLabel,
}: {
  title: string;
  rows: { label: string; value: number; href: string }[];
  valueLabel: string;
  formatValue: (value: number) => string;
  hrefForRow?: (index: number) => string;
  ariaLabel: string;
}) {
  const scale = chartScale(rows.map((row) => row.value), 100);
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
      {rows.length ? (
        <ul aria-label={ariaLabel} className="mt-3 space-y-3">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`}>
              <Link href={hrefForRow?.(index) ?? row.href} className="focus-ring block rounded">
                <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                  <span className="truncate text-neutral-700 dark:text-neutral-200">{row.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">{formatValue(row.value)}</span>
                </div>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-brand-800">
                  <span className="block h-full rounded-full bg-brand-600" style={{ width: `${scale.position(row.value)}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-xs text-neutral-500">No {valueLabel.toLowerCase()} data yet.</p>}
    </div>
  );
}

function CollectionsChart({ trends }: { trends: Trends }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { points, unit } = trends.collections;
  const values = points.map((point) => point.amount);
  const scale = chartScale(values, 82);
  const padding = 22;
  const innerWidth = WIDTH - padding * 2;
  const coords = points.map((point, index) => ({
    x: points.length <= 1 ? WIDTH / 2 : padding + (index / (points.length - 1)) * innerWidth,
    y: CHART_BOTTOM - scale.position(point.amount),
    point,
  }));
  const line = coords.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const area = coords.length ? `${line} L ${coords.at(-1)!.x} ${CHART_BOTTOM} L ${coords[0].x} ${CHART_BOTTOM} Z` : "";
  const selectedPoint = points.find((point) => point.key === selectedKey);

  return (
    <div>
      {points.length ? (
        <>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Received payment collections by ${unit}`}
            className="h-44 w-full"
            preserveAspectRatio="none"
          >
            <line x1="0" x2={WIDTH} y1={CHART_BOTTOM} y2={CHART_BOTTOM} stroke="currentColor" className="text-neutral-200 dark:text-brand-700" />
            <path d={area} fill="var(--color-brand-600, #1d4ed8)" opacity="0.12" />
            <path d={line} fill="none" stroke="var(--color-brand-600, #1d4ed8)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {coords.map(({ x, y, point }) => (
              <circle
                key={point.key}
                cx={x}
                cy={y}
                r="4"
                fill="var(--color-brand-600, #1d4ed8)"
                tabIndex={0}
                aria-label={`${point.label}: ${formatInr(point.amount)} received`}
                onClick={() => setSelectedKey(point.key)}
                onFocus={() => setSelectedKey(point.key)}
              >
                <title>{point.label}: {formatInr(point.amount)} received</title>
              </circle>
            ))}
            {coords.filter((_, index) => index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 5) === 0).map(({ x, point }) => (
              <text key={`label-${point.key}`} x={x} y={CHART_BOTTOM + 19} textAnchor="middle" className="fill-neutral-500 text-[9px] dark:fill-neutral-400">{point.label}</text>
            ))}
          </svg>
          {selectedPoint && (
            <p aria-live="polite" className="mt-1 text-center text-xs text-neutral-600 dark:text-neutral-300">
              {selectedPoint.label} · {formatInr(selectedPoint.amount)} received
            </p>
          )}
          <table className="sr-only">
            <caption>Collections received by {unit}</caption>
            <thead><tr><th>{unit}</th><th>Received</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.key}><th>{point.label}</th><td>{formatInr(point.amount)}</td></tr>)}</tbody>
          </table>
        </>
      ) : <p className="py-8 text-center text-xs text-neutral-500">No collections in this period.</p>}
    </div>
  );
}

export function TrendsSection({ trends, onRetry }: { trends: Trends | { error: true } | null | undefined; onRetry: () => void }) {
  if (!trends || "error" in trends) {
    return (
      <section aria-labelledby="trends-title" className="space-y-4">
        <h2 id="trends-title" className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white">Trends</h2>
        <WidgetUnavailable onRetry={onRetry} />
      </section>
    );
  }
  const financialPoints = Array.isArray(trends.financials) ? trends.financials : null;
  return (
    <section aria-labelledby="trends-title" className="space-y-4">
      <h2 id="trends-title" className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white">Trends</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Revenue vs Expenses vs Net profit" subtitle="Monthly totals within the selected period">
          {financialPoints ? <FinancialTrendChart points={financialPoints} /> : <WidgetUnavailable onRetry={onRetry} />}
        </DashboardPanel>
        <DashboardPanel title="Taxable revenue vs hire cost" subtitle="Monthly totals; revenue excludes GST">
          <RevenueCostChart trends={trends} />
        </DashboardPanel>
        <DashboardPanel title="Collections" subtitle={`Received payments · by ${trends.collections.unit}`}>
          <CollectionsChart trends={trends} />
        </DashboardPanel>
        <DashboardPanel title="Top customers" subtitle="By billed amount">
          <RankBars
            title="Customers"
            ariaLabel="Top customers by billed amount"
            valueLabel="Billed amount"
            rows={trends.topCustomers.map((customer) => ({
              label: customer.name,
              value: customer.amount,
              href: customer.id ? `/admin/customers?partyId=${encodeURIComponent(customer.id)}` : "/admin/customers",
            }))}
            formatValue={formatInr}
          />
        </DashboardPanel>
        <DashboardPanel title="Top routes" subtitle="By LR count">
          <RankBars
            title="Routes"
            ariaLabel="Top routes by LR count"
            valueLabel="Route count"
            rows={(trends.topRoutes ?? []).map((route) => ({
              label: `${route.from} → ${route.to}`,
              value: route.count,
              href: "/admin/bookings",
            }))}
            formatValue={(value) => `${value} LRs`}
          />
        </DashboardPanel>
      </div>
    </section>
  );
}
