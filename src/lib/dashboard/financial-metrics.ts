import { computeBillSummary, type BillAdjustments } from "@/lib/bill/validations";
import { computeDelta } from "@/lib/dashboard/build-deltas";
import type { TrendBucket } from "@/lib/dashboard/periods";
import { fromPaise, paise } from "@/lib/ledger/build-ledger";
import type { Financials, FinancialTrendPoint, KpiValue } from "@/lib/dashboard/types";

interface KeyedAmount {
  key: string;
  amount: number;
}

export interface ExpenseCategoryTotals {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
}

/** Reuse the bill calculation's taxable subtotal; tax and withholding are not revenue. */
export function taxableBillRevenue(tripTotal: number, adjustments?: Partial<BillAdjustments>): number {
  return computeBillSummary(tripTotal, adjustments).taxable;
}

function kpiValue(current: number, previous: number): KpiValue {
  const value = fromPaise(paise(current));
  const prior = fromPaise(paise(previous));
  return { value, previous: prior, deltaPct: computeDelta(value, prior).pct };
}

export function buildFinancials(
  revenue: { current: number; previous: number },
  expenseCategories: readonly ExpenseCategoryTotals[],
  buckets: readonly TrendBucket[],
  revenueTrend: readonly KeyedAmount[],
  expenseTrend: readonly KeyedAmount[],
  trendUnit: "day" | "month"
): Financials {
  const currentRevenue = fromPaise(paise(revenue.current));
  const previousRevenue = fromPaise(paise(revenue.previous));
  const currentExpenses = fromPaise(expenseCategories.reduce(
    (total, category) => total + (category.current == null ? 0 : paise(category.current)),
    0
  ));
  const previousExpenses = fromPaise(expenseCategories.reduce(
    (total, category) => total + (category.previous == null ? 0 : paise(category.previous)),
    0
  ));
  const currentProfit = fromPaise(paise(currentRevenue) - paise(currentExpenses));
  const previousProfit = fromPaise(paise(previousRevenue) - paise(previousExpenses));
  const expensesTotal = kpiValue(currentExpenses, previousExpenses);
  const sumByKey = (rows: readonly KeyedAmount[]) => {
    const amounts = new Map<string, number>();
    for (const row of rows) amounts.set(row.key, (amounts.get(row.key) ?? 0) + paise(row.amount));
    return amounts;
  };
  const revenueByBucket = sumByKey(revenueTrend);
  const expenseByBucket = sumByKey(expenseTrend);
  const trend: FinancialTrendPoint[] = buckets.map((bucket) => {
    const revenuePaise = revenueByBucket.get(bucket.key) ?? 0;
    const expensesPaise = expenseByBucket.get(bucket.key) ?? 0;
    return {
      key: bucket.key,
      label: bucket.label,
      revenue: fromPaise(revenuePaise),
      expenses: fromPaise(expensesPaise),
      netProfit: fromPaise(revenuePaise - expensesPaise),
    };
  });
  return {
    revenue: kpiValue(currentRevenue, previousRevenue),
    expenses: {
      total: expensesTotal,
    },
    netProfit: kpiValue(currentProfit, previousProfit),
    marginPct: currentRevenue === 0 ? null : Math.round((currentProfit / currentRevenue) * 10000) / 100,
    trend,
    trendUnit,
  };
}
