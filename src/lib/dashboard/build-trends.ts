/**
 * Turns grouped rows from the database into the chart series. Pure.
 */
import { fromPaise, paise } from "@/lib/ledger/build-ledger";
import { bucketIndex, parseIstDate, type TrendBucket } from "@/lib/dashboard/periods";
import type { CollectionPoint, RevenueCostPoint } from "@/lib/dashboard/types";

/** Rows the aggregations return, keyed `YYYY-MM` (months) or `YYYY-MM-DD` (days) in IST. */
export interface KeyedAmount {
  key: string;
  amount: number;
}

/** One point per month bucket; months with no rows are 0, rows outside the buckets are ignored. */
export function buildRevenueSeries(
  buckets: readonly TrendBucket[],
  revenue: readonly KeyedAmount[],
  cost: readonly KeyedAmount[]
): RevenueCostPoint[] {
  const sum = (rows: readonly KeyedAmount[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.key, (m.get(r.key) ?? 0) + paise(r.amount));
    return m;
  };
  const rev = sum(revenue);
  const cst = sum(cost);
  return buckets.map((b) => ({
    key: b.key,
    label: b.label,
    revenue: fromPaise(rev.get(b.key) ?? 0),
    cost: fromPaise(cst.get(b.key) ?? 0),
  }));
}

/** Rolls per-day rows into day or week buckets. Days outside every bucket are ignored. */
export function buildCollectionSeries(buckets: readonly TrendBucket[], days: readonly KeyedAmount[]): CollectionPoint[] {
  const totals = new Array<number>(buckets.length).fill(0);
  for (const row of days) {
    const day = parseIstDate(row.key);
    if (!day) continue;
    const i = bucketIndex(buckets, day);
    if (i >= 0) totals[i] += paise(row.amount);
  }
  return buckets.map((b, i) => ({ key: b.key, label: b.label, amount: fromPaise(totals[i]) }));
}
