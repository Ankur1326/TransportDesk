/**
 * Supplier (payable) ledger built from lorry hire contracts. Pure and
 * browser-safe. Positive balance = we owe the supplier.
 */
export interface SupplierLedgerPaymentInput {
  _id: string;
  kind: string;
  amount: number;
  date: string;
  mode?: string;
  reference?: string;
}

export interface SupplierLedgerContractInput {
  _id: string;
  lhcNo: string;
  lhcDate: string;
  status: string;
  vehicleNumber?: string;
  netPayable: number;
  payments: SupplierLedgerPaymentInput[];
}

export interface SupplierOpening {
  amount: number;
  /** "credit" = payable to supplier, "debit" = advance already paid. */
  balanceType: "credit" | "debit";
  date: string;
}

export type SupplierEntryType = "opening" | "hire" | "payment";

export interface SupplierLedgerEntry {
  id: string;
  type: SupplierEntryType;
  date: string;
  label: string;
  lhcNo?: string;
  /** Increases what we owe. */
  payable: number;
  /** Reduces what we owe. */
  paid: number;
  mode?: string;
  reference?: string;
  /** Running balance after this entry (oldest to newest). */
  balance: number;
}

export interface SupplierContractStatus {
  _id: string;
  lhcNo: string;
  lhcDate: string;
  vehicleNumber?: string;
  netPayable: number;
  paid: number;
  outstanding: number;
}

export interface SupplierAgeingBucket {
  key: "0-30" | "31-60" | "61-90" | "90+";
  label: string;
  amount: number;
  count: number;
}

export interface SupplierLedger {
  entries: SupplierLedgerEntry[]; // oldest first
  contracts: SupplierContractStatus[];
  totalPayable: number;
  totalPaid: number;
  /** Positive = we owe supplier; negative = supplier owes us (advance). */
  balance: number;
  ageing: SupplierAgeingBucket[];
}

const toPaise = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100);
const fromPaise = (p: number): number => p / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const bucketFor = (days: number): SupplierAgeingBucket["key"] =>
  days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";

export function buildSupplierLedger(input: {
  opening?: SupplierOpening;
  contracts: SupplierLedgerContractInput[];
  now: Date;
}): SupplierLedger {
  const live = input.contracts.filter((c) => c.status !== "Cancelled");

  type Raw = Omit<SupplierLedgerEntry, "balance"> & { payableP: number; paidP: number; order: number };
  const raws: Raw[] = [];

  const op = input.opening;
  if (op && toPaise(op.amount) > 0) {
    const p = toPaise(op.amount);
    raws.push({
      id: "opening",
      type: "opening",
      date: op.date,
      label: "Opening balance",
      payable: op.balanceType === "credit" ? fromPaise(p) : 0,
      paid: op.balanceType === "debit" ? fromPaise(p) : 0,
      payableP: op.balanceType === "credit" ? p : 0,
      paidP: op.balanceType === "debit" ? p : 0,
      order: 0,
    });
  }

  const contracts: SupplierContractStatus[] = [];
  for (const c of live) {
    const netP = toPaise(c.netPayable);
    let paidP = 0;
    raws.push({
      id: `hire-${c._id}`,
      type: "hire",
      date: c.lhcDate,
      label: `Truck hire${c.vehicleNumber ? ` · ${c.vehicleNumber}` : ""}`,
      lhcNo: c.lhcNo,
      payable: fromPaise(netP),
      paid: 0,
      payableP: netP,
      paidP: 0,
      order: 1,
    });
    for (const pay of c.payments) {
      const p = toPaise(pay.amount);
      if (p <= 0) continue;
      paidP += p;
      raws.push({
        id: `pay-${pay._id}`,
        type: "payment",
        date: pay.date,
        label: `${pay.kind} payment`,
        lhcNo: c.lhcNo,
        payable: 0,
        paid: fromPaise(p),
        payableP: 0,
        paidP: p,
        mode: pay.mode,
        reference: pay.reference,
        order: 2,
      });
    }
    contracts.push({
      _id: c._id,
      lhcNo: c.lhcNo,
      lhcDate: c.lhcDate,
      vehicleNumber: c.vehicleNumber,
      netPayable: fromPaise(netP),
      paid: fromPaise(paidP),
      outstanding: fromPaise(Math.max(0, netP - paidP)),
    });
  }

  raws.sort((a, b) => {
    const t = new Date(a.date).getTime() - new Date(b.date).getTime();
    return t !== 0 ? t : a.order - b.order;
  });

  let running = 0;
  let totalPayableP = 0;
  let totalPaidP = 0;
  const entries: SupplierLedgerEntry[] = raws.map((r) => {
    running += r.payableP - r.paidP;
    totalPayableP += r.payableP;
    totalPaidP += r.paidP;
    const { payableP: _a, paidP: _b, order: _c, ...rest } = r;
    void _a; void _b; void _c;
    return { ...rest, balance: fromPaise(running) };
  });

  const ageing: SupplierAgeingBucket[] = [
    { key: "0-30", label: "0–30 days", amount: 0, count: 0 },
    { key: "31-60", label: "31–60 days", amount: 0, count: 0 },
    { key: "61-90", label: "61–90 days", amount: 0, count: 0 },
    { key: "90+", label: "90+ days", amount: 0, count: 0 },
  ];
  for (const c of contracts) {
    if (c.outstanding <= 0) continue;
    const t = new Date(c.lhcDate).getTime();
    const days = Number.isNaN(t) ? 0 : Math.max(0, Math.floor((input.now.getTime() - t) / DAY_MS));
    const bucket = ageing.find((b) => b.key === bucketFor(days))!;
    bucket.amount = fromPaise(toPaise(bucket.amount) + toPaise(c.outstanding));
    bucket.count += 1;
  }

  return {
    entries,
    contracts,
    totalPayable: fromPaise(totalPayableP),
    totalPaid: fromPaise(totalPaidP),
    balance: fromPaise(running),
    ageing,
  };
}

/** Entries within [from, to], with running balance kept from the full history. */
export function filterEntries(
  entries: SupplierLedgerEntry[],
  from: Date | null,
  to: Date | null,
  type: "all" | "payable" | "paid" = "all"
): SupplierLedgerEntry[] {
  return entries.filter((e) => {
    const t = new Date(e.date).getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    if (type === "payable") return e.payable > 0;
    if (type === "paid") return e.paid > 0;
    return true;
  });
}
