import dbConnect from "@/lib/db";
import { financialsBillMatch, financialsHireMatch } from "@/lib/dashboard/loader-scopes";
import { buildFinancials, type ExpenseCategoryTotals } from "@/lib/dashboard/financial-metrics";
import { billTaxableValueExpression, hireCostExpression } from "@/lib/dashboard/financial-expressions";
import { DASHBOARD_TIMEZONE, financialBuckets, type ResolvedPeriod, type TrendBucket } from "@/lib/dashboard/periods";
import { rupees, type DashboardRange } from "@/lib/dashboard/shared";
import BillModel from "@/models/Bill";
import LorryHireModel from "@/models/LorryHire";

interface FinancialAggregation {
  totals: { current: number; previous: number }[];
  trend: { _id: string; amount: number }[];
}

interface ExpenseResult {
  category: ExpenseCategoryTotals;
  trend: { key: string; amount: number }[];
}

function aggregationPipeline(
  field: string,
  amount: unknown,
  range: DashboardRange,
  period: ResolvedPeriod,
  buckets: readonly TrendBucket[],
  unit: "day" | "month"
) {
  const dateToKey = {
    $dateToString: {
      format: unit === "day" ? "%Y-%m-%d" : "%Y-%m",
      date: `$${field}`,
      timezone: DASHBOARD_TIMEZONE,
    },
  };
  const current = (from: Date, to: Date) => ({
    $and: [{ $gte: [`$${field}`, from] }, { $lt: [`$${field}`, to] }],
  });
  return [
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              current: { $sum: { $cond: [current(range.from, range.to), amount, 0] } },
              previous: { $sum: { $cond: [current(range.previousFrom, range.previousTo), amount, 0] } },
            },
          },
        ],
        trend: [
          { $match: { [field]: { $gte: period.from, $lt: period.to } } },
          { $group: { _id: dateToKey, amount: { $sum: amount } } },
        ],
      },
    },
  ];
}

type ExpenseLoader = (
  companyId: string,
  range: DashboardRange,
  period: ResolvedPeriod,
  buckets: readonly TrendBucket[],
  unit: "day" | "month"
) => Promise<ExpenseResult>;

const expenseLoaders: ExpenseLoader[] = [
  async (companyId, range, period, buckets, unit) => {
    const [result] = await LorryHireModel.aggregate<FinancialAggregation>([
      { $match: financialsHireMatch(companyId, range) },
      ...aggregationPipeline("lhcDate", hireCostExpression(), range, period, buckets, unit),
    ]);
    return {
      category: {
        key: "lorryHire",
        label: "Lorry hire cost",
        current: result?.totals[0]?.current ?? 0,
        previous: result?.totals[0]?.previous ?? 0,
      },
      trend: (result?.trend ?? []).map((row) => ({ key: row._id, amount: rupees(row.amount) })),
    };
  },
];

export async function loadFinancials(companyId: string, period: ResolvedPeriod) {
  await dbConnect();
  const { buckets, unit } = financialBuckets(period);
  const range: DashboardRange = {
    from: period.from,
    to: period.to,
    previousFrom: period.previousFrom,
    previousTo: period.previousTo,
  };
  const [billResults, ...expenseResults] = await Promise.all([
    BillModel.aggregate<FinancialAggregation>([
      { $match: financialsBillMatch(companyId, range) },
      ...aggregationPipeline("billDate", billTaxableValueExpression(), range, period, buckets, unit),
    ]),
    ...expenseLoaders.map((load) => load(companyId, range, period, buckets, unit)),
  ]);
  const bills = billResults[0];
  const revenue = {
    current: bills?.totals[0]?.current ?? 0,
    previous: bills?.totals[0]?.previous ?? 0,
  };
  const expenseCategories = expenseResults.map(({ category }) => category);
  const expenseTrend = expenseResults.flatMap(({ trend }) => trend);
  return buildFinancials(
    revenue,
    [
      ...expenseCategories,
      { key: "other", label: "Other expenses", current: null, previous: null },
    ],
    buckets,
    (bills?.trend ?? []).map((row) => ({ key: row._id, amount: rupees(row.amount) })),
    expenseTrend,
    unit
  );
}
