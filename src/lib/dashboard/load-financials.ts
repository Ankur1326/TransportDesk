import dbConnect from "@/lib/db";
import { financialsBillMatch, financialsHireMatch } from "@/lib/dashboard/loader-scopes";
import { buildFinancials, type ExpenseCategoryTotals } from "@/lib/dashboard/financial-metrics";
import { billTaxableValueExpression, hireCostExpression } from "@/lib/dashboard/financial-expressions";
import type { DashboardRange } from "@/lib/dashboard/shared";
import BillModel from "@/models/Bill";
import LorryHireModel from "@/models/LorryHire";

interface FinancialTotals {
  current: number;
  previous: number;
}

type ExpenseLoader = (companyId: string, range: DashboardRange) => Promise<ExpenseCategoryTotals>;

function dateTotalStages(field: string, amount: unknown, range: DashboardRange) {
  const inWindow = (from: Date, to: Date) => ({
    $and: [{ $gte: [`$${field}`, from] }, { $lt: [`$${field}`, to] }],
  });
  return [
    {
      $group: {
        _id: null,
        current: { $sum: { $cond: [inWindow(range.from, range.to), amount, 0] } },
        previous: { $sum: { $cond: [inWindow(range.previousFrom, range.previousTo), amount, 0] } },
      },
    },
  ];
}

const expenseLoaders: ExpenseLoader[] = [
  async (companyId, range) => {
    const [row] = await LorryHireModel.aggregate<FinancialTotals>([
      { $match: financialsHireMatch(companyId, range) },
      ...dateTotalStages("lhcDate", hireCostExpression(), range),
    ]);
    return {
      key: "lorryHire",
      label: "Lorry hire cost",
      current: row?.current ?? 0,
      previous: row?.previous ?? 0,
    };
  },
];

export async function loadFinancials(companyId: string, range: DashboardRange) {
  await dbConnect();
  const [billRows, ...expenseCategories] = await Promise.all([
    BillModel.aggregate<FinancialTotals>([
      { $match: financialsBillMatch(companyId, range) },
      ...dateTotalStages("billDate", billTaxableValueExpression(), range),
    ]),
    ...expenseLoaders.map((load) => load(companyId, range)),
  ]);
  const revenue = billRows[0] ?? { current: 0, previous: 0 };
  return buildFinancials(revenue, [
    ...expenseCategories,
    { key: "other", label: "Other expenses", current: null, previous: null },
  ]);
}
