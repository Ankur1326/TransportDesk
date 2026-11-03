import { companyFilter } from "@/lib/company-filter";
import { fromPaise, paise } from "@/lib/ledger/build-ledger";
import type { ResolvedPeriod } from "@/lib/dashboard/periods";
import mongoose from "mongoose";

export type DashboardRange = Pick<ResolvedPeriod, "from" | "to" | "previousFrom" | "previousTo">;

export function scopedMatch(companyId: string, match: Record<string, unknown> = {}) {
  return { $and: [companyFilter(companyId), match] };
}

export function dateWindow(field: string, from: Date, to: Date) {
  return { [field]: { $gte: from, $lt: to } };
}

export function inEitherPeriod(field: string, range: DashboardRange) {
  return {
    $or: [
      dateWindow(field, range.from, range.to),
      dateWindow(field, range.previousFrom, range.previousTo),
    ],
  };
}

export function rangeTotalsPipeline(
  dateField: string,
  amountExpression: unknown,
  range: DashboardRange
) {
  const isIn = (from: Date, to: Date) => ({
    $and: [{ $gte: [`$${dateField}`, from] }, { $lt: [`$${dateField}`, to] }],
  });
  return [
    { $match: inEitherPeriod(dateField, range) },
    {
      $group: {
        _id: null,
        current: { $sum: { $cond: [isIn(range.from, range.to), amountExpression, 0] } },
        previous: { $sum: { $cond: [isIn(range.previousFrom, range.previousTo), amountExpression, 0] } },
      },
    },
  ];
}

/** Storage uses rupees; ledger helpers accumulate paise and convert at this boundary. */
export function rupees(value: unknown): number {
  const amount = Number(value);
  return fromPaise(paise(Number.isFinite(amount) ? amount : 0));
}

export async function collectionExists(name: string): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not ready.");
  return db.listCollections({ name }, { nameOnly: true }).hasNext();
}
