/**
 * Pure helpers for the `billing` marker kept on each Consignment.
 *
 * `Consignment.billing` is a denormalised cache of "which freight bill is this
 * LR on". The Bill documents (`items.consignmentId`) are the source of truth,
 * so the cache can always be rebuilt (scripts/reconcile-lr-billing.ts).
 *
 * Not to be confused with `Consignment.payment`, the LR's freight payment type
 * (Paid / To Pay / TBB).
 */

export interface LrBillingMarker {
  billed: boolean;
  billId?: string;
  billNo?: string;
  billedAt?: Date;
}

/** Which LR ids were added to / removed from a bill by an edit. */
export interface LrIdDiff {
  added: string[];
  removed: string[];
  kept: string[];
}

const uniq = (ids: Iterable<string>): string[] => [...new Set([...ids].map(String))];

export function diffLrIds(previous: Iterable<string>, next: Iterable<string>): LrIdDiff {
  const prev = new Set(uniq(previous));
  const curr = new Set(uniq(next));
  return {
    added: [...curr].filter((id) => !prev.has(id)),
    removed: [...prev].filter((id) => !curr.has(id)),
    kept: [...curr].filter((id) => prev.has(id)),
  };
}

/** The marker an LR gets while it is on `bill`. */
export function buildBillingMarker(bill: { id: string; billNo: string; billDate?: Date | string | null }): LrBillingMarker {
  const at = bill.billDate ? new Date(bill.billDate) : undefined;
  return {
    billed: true,
    billId: bill.id,
    billNo: bill.billNo,
    ...(at && !Number.isNaN(at.getTime()) ? { billedAt: at } : {}),
  };
}

/** Is this LR on a bill according to its (possibly missing) marker? */
export const isBilledMarker = (m: { billed?: boolean | null } | null | undefined): boolean => Boolean(m?.billed);

/** Message for the cancel / delete guards. */
export function billedLrMessage(lrNo: string, billNo: string | undefined, action: "cancelled" | "deleted"): string {
  const where = billNo ? `freight bill ${billNo}` : "a freight bill";
  return `LR ${lrNo} is on ${where} and can't be ${action}. Remove it from the bill first.`;
}

/** Message for removing LRs from a bill that already has payments. */
export function removeFromPaidBillMessage(billNo: string, lrNos: string[]): string {
  const list = lrNos.length > 3 ? `${lrNos.slice(0, 3).join(", ")} and ${lrNos.length - 3} more` : lrNos.join(", ");
  return `Bill ${billNo} already has payments, so LR ${list} can't be removed from it. Delete or move the payments first.`;
}

/**
 * Rebuilds the intended marker for every LR from a list of bills. When an LR
 * sits on several bills the latest bill (by billDate, then id) wins.
 */
export function markersFromBills(
  bills: { id: string; billNo: string; billDate?: Date | string | null; lrIds: string[] }[]
): Map<string, LrBillingMarker> {
  const time = (d: Date | string | null | undefined) => {
    const t = d ? new Date(d).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };
  const ordered = [...bills].sort((a, b) => time(a.billDate) - time(b.billDate) || a.id.localeCompare(b.id));
  const out = new Map<string, LrBillingMarker>();
  for (const bill of ordered) {
    const marker = buildBillingMarker(bill);
    for (const lrId of bill.lrIds) out.set(String(lrId), marker); // later bills overwrite earlier ones
  }
  return out;
}

/** Do two markers describe the same state? (used by the reconcile script to skip no-op writes) */
export function sameMarker(
  a: (Omit<Partial<LrBillingMarker>, "billId"> & { billId?: unknown }) | null | undefined,
  b: (Omit<Partial<LrBillingMarker>, "billId"> & { billId?: unknown }) | null | undefined
): boolean {
  const billedA = Boolean(a?.billed);
  const billedB = Boolean(b?.billed);
  if (!billedA || !billedB) return billedA === billedB;
  const at = (d: Date | string | undefined) => (d ? new Date(d).getTime() : 0);
  return String(a?.billId ?? "") === String(b?.billId ?? "") && (a?.billNo ?? "") === (b?.billNo ?? "") && at(a?.billedAt) === at(b?.billedAt);
}
