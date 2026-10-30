/**
 * Splits one received amount across a customer's open invoices, oldest first.
 * Pure and browser-safe: the dialog uses it for the preview and the server uses
 * the very same function to decide what is actually saved.
 */
export interface OpenBill {
  billId: string;
  billNo: string;
  /** ISO date. */
  billDate: string;
  outstanding: number;
}

export interface Allocation {
  billId: string;
  billNo: string;
  amount: number;
}

export interface AllocationPlan {
  allocations: Allocation[];
  /** Left over after every open invoice is cleared; kept as an advance (credit). */
  unapplied: number;
}

const toPaise = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100);

/** Oldest bill date first; same date -> bill number in natural order. */
export function sortOldestFirst<T extends { billDate: string; billNo: string }>(bills: T[]): T[] {
  return [...bills].sort(
    (a, z) =>
      new Date(a.billDate).getTime() - new Date(z.billDate).getTime() ||
      a.billNo.localeCompare(z.billNo, undefined, { numeric: true })
  );
}

export function planAllocation(bills: OpenBill[], amount: number): AllocationPlan {
  let left = toPaise(amount);
  const allocations: Allocation[] = [];
  if (left <= 0) return { allocations, unapplied: 0 };

  for (const b of sortOldestFirst(bills)) {
    if (left <= 0) break;
    const room = toPaise(b.outstanding);
    if (room <= 0) continue;
    const take = Math.min(room, left);
    allocations.push({ billId: b.billId, billNo: b.billNo, amount: take / 100 });
    left -= take;
  }
  return { allocations, unapplied: left / 100 };
}
