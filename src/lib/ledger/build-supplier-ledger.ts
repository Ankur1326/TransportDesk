/**
 * Pure supplier-ledger maths (NO database access). Mirrors build-ledger.ts with
 * the direction reversed: a lorry hire contract is PAYABLE (we owe, Cr) and a
 * payment to the supplier is PAID (Dr). Net balance > 0 means we owe the supplier;
 * < 0 means we have paid ahead (an advance).
 *
 * Sorting, filtering and totals come from finalizeLedger() so a supplier ledger
 * can never disagree with a customer ledger on the rules. Contract statuses
 * reuse computeBillStatuses(): a contract is shaped as a "bill" for that call.
 */
import {
  computeBillStatuses,
  finalizeLedger,
  fromPaise,
  iso,
  paise,
  round2,
  type BillStatusInfo,
  type LedgerBill,
  type LedgerEntry,
  type LedgerOptions,
  type LedgerPayment,
  type LedgerResult,
} from "@/lib/ledger/build-ledger";
import type { BalanceType } from "@/lib/opening-balance";

export interface LedgerSupplier {
  _id: string;
  name: string;
  openingBalance: number;
  /** debit = Paid (we paid ahead), credit = Payable (we owe). */
  balanceType: BalanceType;
  createdAt: Date | string;
}

export interface LedgerContract {
  _id: string;
  contractNo: string;
  date: Date | string;
  vehicleNo: string;
  /** LR / bilty numbers carried on the trip (free text, for search and display). */
  consignmentNos: string[];
  hireAmount: number;
  otherCharges: number;
  deductions: number;
  tdsAmount: number;
  /** hire + other - deductions - tds, as stored by the server. */
  totalPayable: number;
  advancePaid: number;
  advanceDate?: string;
  advanceVia?: string;
  remark?: string;
}

export interface SupplierPayment {
  _id: string;
  direction: "paid" | "payable_adjustment";
  contractId?: string | null;
  contractNo?: string;
  amount: number;
  date: Date | string;
  mode?: string;
  reference?: string;
  remark?: string;
}

/** Contract total, paise-safe. The ONLY place this formula lives. */
export function contractTotalPayable(c: {
  hireAmount: number;
  otherCharges: number;
  deductions: number;
  tdsAmount: number;
}): number {
  return fromPaise(paise(c.hireAmount) + paise(c.otherCharges) - paise(c.deductions) - paise(c.tdsAmount));
}

/**
 * Per-contract outstanding = totalPayable - (advance + paid payments linked to it).
 * Returned in the shared BillStatusInfo shape (billId = contract id, billNo = contract no)
 * so ageing, allocation and the payment dialog work unchanged.
 */
export function computeContractStatuses(
  contracts: LedgerContract[],
  payments: SupplierPayment[]
): Record<string, BillStatusInfo> {
  const asBills: LedgerBill[] = contracts.map((c) => ({
    _id: c._id,
    billNo: c.contractNo,
    billDate: c.date,
    totalAmount: c.totalPayable,
    billedToName: "",
    items: [],
    advanceReceived: c.advancePaid,
  }));
  const asPayments: LedgerPayment[] = payments.map((p) => ({
    _id: p._id,
    direction: p.direction === "paid" ? "received" : "payable_adjustment",
    billId: p.contractId ?? undefined,
    amount: p.amount,
    date: p.date,
  }));
  return computeBillStatuses(asBills, asPayments);
}

export function buildSupplierLedger(input: {
  supplier: LedgerSupplier;
  contracts: LedgerContract[];
  payments: SupplierPayment[];
  options?: LedgerOptions;
}): LedgerResult {
  const { supplier, contracts, payments } = input;
  const all: LedgerEntry[] = [];
  const push = (e: Omit<LedgerEntry, "amount" | "date"> & { amount: number; date: Date | string }) => {
    const amount = round2(e.amount);
    if (amount > 0) all.push({ ...e, amount, date: iso(e.date) });
  };

  // 1. opening balance: credit = we owe (payable), debit = we paid ahead (paid)
  push({
    id: `opening:${supplier._id}`,
    date: supplier.createdAt,
    type: "Opening Balance",
    refNo: "Opening",
    label: "Opening Balance",
    amount: supplier.openingBalance,
    side: supplier.balanceType === "credit" ? "payable" : "paid",
    source: "opening",
    sourceId: String(supplier._id),
    meta: {},
  });

  const contractById = new Map(contracts.map((c) => [String(c._id), c]));
  const statuses = computeContractStatuses(contracts, payments);

  // 2 + 3. contracts (payable) and their advance (paid)
  for (const c of contracts) {
    const id = String(c._id);
    push({
      id: `contract:${id}`,
      date: c.date,
      type: "Contract",
      refNo: c.contractNo,
      label: "Lorry Hire",
      amount: c.totalPayable,
      side: "payable",
      source: "contract",
      sourceId: id,
      contractId: id,
      // Everything the edit dialog and the drawer need, so no extra fetch is required.
      meta: {
        items: c.consignmentNos.map((cnsNo) => ({ cnsNo })),
        vehicleNo: c.vehicleNo,
        hireAmount: c.hireAmount,
        otherCharges: c.otherCharges,
        deductions: c.deductions,
        tdsAmount: c.tdsAmount,
        advancePaid: c.advancePaid,
        advanceDate: c.advanceDate ?? "",
        advanceVia: c.advanceVia ?? "",
        remark: c.remark ?? "",
      },
    });
    if (c.advancePaid > 0) {
      push({
        id: `advance:${id}`,
        date: c.advanceDate || c.date,
        type: "Contract",
        refNo: c.contractNo,
        label: "Advance",
        amount: c.advancePaid,
        side: "paid",
        source: "contract_advance",
        sourceId: id,
        contractId: id,
        meta: { mode: c.advanceVia ?? "" },
      });
    }
  }

  // 4 + 5. payments and manual payables, oldest first so "Final settlement"
  // is the payment that clears the contract.
  const runningPaid = new Map<string, number>();
  for (const c of contracts) runningPaid.set(String(c._id), paise(c.advancePaid));
  const sorted = [...payments].sort((a, z) => new Date(a.date).getTime() - new Date(z.date).getTime());
  for (const p of sorted) {
    const contractId = p.contractId ? String(p.contractId) : undefined;
    const contract = contractId ? contractById.get(contractId) : undefined;
    const meta = { mode: p.mode ?? "", reference: p.reference ?? "", remark: p.remark ?? "" };
    if (p.direction === "payable_adjustment") {
      push({
        id: `payment:${p._id}`,
        date: p.date,
        type: "Adjustment",
        refNo: p.contractNo || contract?.contractNo || "Credit",
        label: "Payable (Credit)",
        amount: p.amount,
        side: "payable",
        source: "adjustment",
        sourceId: String(p._id),
        contractId,
        meta,
      });
      continue;
    }
    let label = "Payment";
    if (contract && contractId) {
      const paidSoFar = (runningPaid.get(contractId) ?? 0) + paise(p.amount);
      runningPaid.set(contractId, paidSoFar);
      label = paidSoFar >= paise(contract.totalPayable) ? "Final settlement" : "Part payment";
    }
    push({
      id: `payment:${p._id}`,
      date: p.date,
      type: contract ? "Contract" : "Payment",
      refNo: p.contractNo || contract?.contractNo || "Payment",
      label,
      amount: p.amount,
      side: "paid",
      source: "payment",
      sourceId: String(p._id),
      contractId,
      meta,
    });
  }

  return finalizeLedger(all, statuses, input.options ?? {});
}
