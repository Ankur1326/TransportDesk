/**
 * Merges per-party ledger results into the dashboard's receivables / payables
 * snapshot. Pure. It reuses `computeAgeing` (lib/ledger/ageing) for the buckets
 * and `paise` / `fromPaise` (lib/ledger/build-ledger) for money, so no ledger or
 * ageing arithmetic is re-implemented here.
 */
import { computeAgeing, type Ageing, type AgeingBucket } from "@/lib/ledger/ageing";
import { fromPaise, paise } from "@/lib/ledger/build-ledger";
import { istDaysBetween } from "@/lib/dashboard/periods";
import type { AgeingSummary, PartyRow, PartySnapshot } from "@/lib/dashboard/types";

export const TOP_PARTIES = 5;
/** Invoices older than this many days are "overdue" for the receivables card. */
export const OVERDUE_AFTER_DAYS = 30;

/** Adds several ageing results bucket by bucket (amounts in integer paise, so no float drift). */
export function mergeAgeing(list: readonly Ageing[]): AgeingSummary {
  const template = computeAgeing([], new Date(0)).buckets;
  const sums = new Map<AgeingBucket["key"], { paise: number; count: number }>(
    template.map((b) => [b.key, { paise: 0, count: 0 }])
  );
  for (const ageing of list) {
    for (const b of ageing.buckets) {
      const s = sums.get(b.key);
      if (!s) continue;
      s.paise += paise(b.amount);
      s.count += b.count;
    }
  }
  const buckets: AgeingBucket[] = template.map((b) => ({
    ...b,
    amount: fromPaise(sums.get(b.key)!.paise),
    count: sums.get(b.key)!.count,
  }));
  return { buckets, total: fromPaise(buckets.reduce((s, b) => s + paise(b.amount), 0)) };
}

/** Amount in the buckets older than 30 days. */
export function overdueFromAgeing(ageing: AgeingSummary): number {
  return fromPaise(
    ageing.buckets.filter((b) => b.key !== "0-30").reduce((s, b) => s + paise(b.amount), 0)
  );
}

export interface PartyLedgerInput {
  id: string;
  name: string;
  /** overallNetBalance of the party's ledger. > 0 = money owed (to us for customers, by us for suppliers). */
  net: number;
  /** The ledger's billStatuses values (open invoices / contracts with their outstanding). */
  documents: { billDate: string; outstanding: number }[];
}

export interface PartySnapshotOptions {
  now: Date;
  /** Customers: also count open invoices older than this many days. Omit for suppliers. */
  overdueDocsAfterDays?: number;
  partial?: boolean;
  top?: number;
}

export function buildPartySnapshot(parties: readonly PartyLedgerInput[], opts: PartySnapshotOptions): PartySnapshot {
  const owing = parties.filter((p) => paise(p.net) > 0);
  const totalP = owing.reduce((s, p) => s + paise(p.net), 0);
  const advancesP = parties.filter((p) => paise(p.net) < 0).reduce((s, p) => s + -paise(p.net), 0);

  // A party that is net settled or in credit owes nothing, so its stray open
  // invoices stay out of the ageing strip instead of inflating it past the total.
  const ageing = mergeAgeing(owing.map((p) => computeAgeing(p.documents, opts.now)));

  let overdueDocs: PartySnapshot["overdueDocs"] = null;
  if (opts.overdueDocsAfterDays !== undefined) {
    const limit = opts.overdueDocsAfterDays;
    let count = 0;
    let amountP = 0;
    for (const p of owing) {
      for (const d of p.documents) {
        const outP = paise(d.outstanding);
        const billed = new Date(d.billDate);
        if (outP <= 0 || Number.isNaN(billed.getTime())) continue;
        if (istDaysBetween(billed, opts.now) > limit) {
          count += 1;
          amountP += outP;
        }
      }
    }
    overdueDocs = { count, amount: fromPaise(amountP) };
  }

  const top: PartyRow[] = [...owing]
    .sort((a, b) => paise(b.net) - paise(a.net) || a.name.localeCompare(b.name))
    .slice(0, opts.top ?? TOP_PARTIES)
    .map((p) => ({
      id: p.id,
      name: p.name,
      amount: fromPaise(paise(p.net)),
      oldestDays: p.documents.reduce<number | null>((oldest, document) => {
        if (paise(document.outstanding) <= 0) return oldest;
        const billDate = new Date(document.billDate);
        if (Number.isNaN(billDate.getTime())) return oldest;
        const days = istDaysBetween(billDate, opts.now);
        return oldest === null ? days : Math.max(oldest, days);
      }, null),
    }));

  return {
    total: fromPaise(totalP),
    advances: fromPaise(advancesP),
    partyCount: parties.length,
    owingCount: owing.length,
    ageing,
    unaged: fromPaise(totalP - paise(ageing.total)),
    overdue: overdueFromAgeing(ageing),
    top,
    overdueDocs,
    partial: opts.partial ?? false,
  };
}
