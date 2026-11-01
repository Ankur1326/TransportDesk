/**
 * Lorry Hire Contracts (LHCs) as supplier-ledger contracts. Pure (no database).
 *
 * The Lorry Hire screen is where an LHC and its payments are managed, so the
 * supplier ledger only READS them: the payable is the LHC's net payable and
 * the payments are the LHC's own `payments[]`. The `Payment` rows that mirror
 * those payments are left out of the ledger (see loadSupplierLedgers) so a
 * payment is never counted twice, even if a mirror row failed to save.
 */
import type { LedgerContract, SupplierPayment } from "@/lib/ledger/build-supplier-ledger";

export interface LorryHireForLedger {
  _id: unknown;
  lhcNo: string;
  lhcDate: Date | string;
  status?: string;
  truck?: { vehicleNumber?: string };
  items?: { cnNo?: string }[];
  settlement?: { netPayable?: number };
  remarks?: string;
  payments?: {
    _id: unknown;
    ledgerPaymentId?: unknown;
    kind?: string;
    amount: number;
    date: Date | string;
    mode?: string;
    reference?: string;
    paidTo?: string;
    remark?: string;
  }[];
}

/** Cancelled contracts owe nothing and are left out. */
export const isLiveLorryHire = (h: { status?: string }): boolean => h.status !== "Cancelled";

export function lorryHireToLedgerContract(h: LorryHireForLedger): LedgerContract {
  const net = h.settlement?.netPayable ?? 0;
  return {
    _id: String(h._id),
    contractNo: h.lhcNo,
    date: h.lhcDate,
    vehicleNo: h.truck?.vehicleNumber ?? "",
    consignmentNos: (h.items ?? []).map((i) => i.cnNo ?? "").filter(Boolean),
    hireAmount: net,
    otherCharges: 0,
    deductions: 0,
    tdsAmount: 0,
    totalPayable: net,
    advancePaid: 0,
    remark: h.remarks ?? "",
    lorryHireId: String(h._id),
  };
}

export function lorryHireToLedgerPayments(h: LorryHireForLedger): SupplierPayment[] {
  return (h.payments ?? []).map((p) => ({
    // The mirror row's id when there is one, so it matches what other screens know it by.
    _id: String(p.ledgerPaymentId ?? p._id),
    direction: "paid" as const,
    contractId: String(h._id),
    contractNo: h.lhcNo,
    amount: p.amount,
    date: p.date,
    mode: p.mode,
    reference: p.reference,
    remark: p.remark || `${p.kind ?? "Payment"} payment${p.paidTo ? ` to ${p.paidTo}` : ""}`,
    lorryHireId: String(h._id),
  }));
}
