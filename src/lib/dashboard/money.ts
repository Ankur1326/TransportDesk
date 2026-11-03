import { fromPaise, paise } from "@/lib/ledger/build-ledger";
import type { DashboardRange } from "@/lib/dashboard/shared";

export interface HirePaymentForTotals {
  amount: number;
  date: Date;
  ledgerPaymentId?: string | { toString(): string };
}

/** Counts an embedded LHC payment only if its mirrored supplier Payment exists. */
export function sumUnmirroredHirePayments(
  payments: readonly HirePaymentForTotals[],
  mirroredPaymentIds: ReadonlySet<string>,
  range: DashboardRange
): { current: number; previous: number } {
  let currentPaise = 0;
  let previousPaise = 0;
  for (const payment of payments) {
    if (payment.ledgerPaymentId && mirroredPaymentIds.has(String(payment.ledgerPaymentId))) continue;
    const time = new Date(payment.date).getTime();
    const amount = paise(payment.amount);
    if (time >= range.from.getTime() && time < range.to.getTime()) currentPaise += amount;
    if (time >= range.previousFrom.getTime() && time < range.previousTo.getTime()) previousPaise += amount;
  }
  return { current: fromPaise(currentPaise), previous: fromPaise(previousPaise) };
}

export function isLiveStatus(status: string | null | undefined): boolean {
  return status !== "Cancelled";
}

export function legacyLrStatus(status: string | null | undefined): "Booked" | string {
  return status || "Booked";
}
