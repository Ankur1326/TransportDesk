/**
 * Ageing of open invoices by bill date. Pure; the caller passes `now` so the
 * result is reproducible (and so React render stays free of Date.now()).
 *
 * Only invoice outstanding is bucketed. Opening balance and unapplied advances
 * have no invoice date, so they are not part of the ageing strip.
 */
export interface AgeingBucket {
  key: "0-30" | "31-60" | "61-90" | "90+";
  label: string;
  amount: number;
  count: number;
}

export interface Ageing {
  buckets: AgeingBucket[];
  /** Sum of all open invoice outstanding. */
  total: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const bucketFor = (days: number): AgeingBucket["key"] =>
  days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";

export function computeAgeing(bills: Iterable<{ billDate: string; outstanding: number }>, now: Date): Ageing {
  const buckets: AgeingBucket[] = [
    { key: "0-30", label: "0–30 days", amount: 0, count: 0 },
    { key: "31-60", label: "31–60 days", amount: 0, count: 0 },
    { key: "61-90", label: "61–90 days", amount: 0, count: 0 },
    { key: "90+", label: "90+ days", amount: 0, count: 0 },
  ];
  let totalPaise = 0;
  const paise = new Map<AgeingBucket["key"], number>();

  for (const b of bills) {
    const outstandingPaise = Math.round((Number.isFinite(b.outstanding) ? b.outstanding : 0) * 100);
    if (outstandingPaise <= 0) continue;
    const t = new Date(b.billDate).getTime();
    // A bill dated in the future (or with a broken date) counts as current.
    const days = Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
    const key = bucketFor(days);
    paise.set(key, (paise.get(key) ?? 0) + outstandingPaise);
    totalPaise += outstandingPaise;
    buckets.find((x) => x.key === key)!.count += 1;
  }
  for (const b of buckets) b.amount = (paise.get(b.key) ?? 0) / 100;
  return { buckets, total: totalPaise / 100 };
}
