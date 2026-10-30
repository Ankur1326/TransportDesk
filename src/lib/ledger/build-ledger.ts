/**
 * Pure customer-ledger maths. NO database access: callers load the rows and
 * pass them in. Every money calculation lives here (paise-safe, 2 decimals).
 */
import type { BalanceType } from "@/lib/opening-balance";

export type LedgerSide = "receivable" | "received";
export type LedgerSource =
  | "opening"
  | "bill"
  | "bill_advance"
  | "payment"
  | "adjustment"
  | "bilty_receipt"
  | "unbilled_bilty";
export type BillStatus = "Unpaid" | "Partial" | "Paid";
export type LedgerTypeFilter = "all" | "receivable" | "received";

export interface LedgerCustomer {
  _id: string;
  name: string;
  openingBalance: number;
  balanceType: BalanceType;
  createdAt: Date | string;
}

export interface LedgerBill {
  _id: string;
  billNo: string;
  billDate: Date | string;
  totalAmount: number;
  customerId?: string | null;
  billedToName: string;
  items: { consignmentId: string; cnsNo: string; freightAmt: number }[];
  advanceReceived: number;
  advanceDate?: string;
  advanceVia?: string;
}

export interface LedgerPayment {
  _id: string;
  direction: "received" | "paid" | "receivable_adjustment";
  billId?: string | null;
  billNo?: string;
  amount: number;
  date: Date | string;
  mode?: string;
  reference?: string;
  remark?: string;
}

export interface LedgerConsignment {
  _id: string;
  consignmentNumber: string;
  bookingDate: Date | string;
  freight: number;
  consignorName?: string;
  consigneeName?: string;
  billingParty?: string;
  billingAccount?: string;
  paymentStatus?: string;
  receivedMoney?: string;
  receivedDate?: string;
  receivedType?: string;
  UTRNumber?: string;
  mrNumber?: string;
}

export interface LedgerOptions {
  includeUnbilled?: boolean;
  from?: Date | null;
  to?: Date | null;
  type?: LedgerTypeFilter;
  search?: string;
}

export interface LedgerEntry {
  id: string;
  date: string; // ISO
  type: string;
  refNo: string;
  label: string;
  amount: number;
  side: LedgerSide;
  source: LedgerSource;
  sourceId: string;
  billId?: string;
  consignmentId?: string;
  meta: Record<string, unknown>;
}

export interface BillStatusInfo {
  billId: string;
  billNo: string;
  /** ISO date of the bill. */
  billDate: string;
  totalAmount: number;
  paid: number;
  outstanding: number;
  status: BillStatus;
}

export interface LedgerSummary {
  entries: number;
  totalReceivable: number;
  totalReceived: number;
  netBalance: number;
  /** Net balance with no date / type / search filter applied. */
  overallNetBalance: number;
}

export interface LedgerResult {
  entries: LedgerEntry[];
  summary: LedgerSummary;
  billStatuses: Record<string, BillStatusInfo>;
}

// ─── money helpers ──────────────────────────────────────────────────────────
export const round2 = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const paise = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100);
const fromPaise = (p: number): number => p / 100;

/** Parses the string `payment.receivedMoney`; returns 0 for NaN / <= 0. */
export function parseMoney(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

export const normName = (s: string | undefined | null): string => (s ?? "").trim().toLowerCase();

/** Party a bilty is billed to (consignor / consignee / third-party account). */
export function billedPartyName(c: LedgerConsignment): string {
  if (c.billingParty === "Consignor") return normName(c.consignorName);
  if (c.billingParty === "Consignee") return normName(c.consigneeName);
  if (c.billingParty === "Third Party") return normName(c.billingAccount);
  return "";
}

/** Does this bill belong to the customer? customerId wins; else exact name match. */
export function billBelongsToCustomer(
  bill: Pick<LedgerBill, "customerId" | "billedToName">,
  customer: Pick<LedgerCustomer, "_id" | "name">
): boolean {
  if (bill.customerId) return String(bill.customerId) === String(customer._id);
  return normName(bill.billedToName) === normName(customer.name);
}

export function billStatusOf(totalAmount: number, paid: number): BillStatus {
  const outstanding = paise(totalAmount) - paise(paid);
  if (outstanding <= 0) return "Paid";
  return paise(paid) > 0 ? "Partial" : "Unpaid";
}

/** Per-bill outstanding = total - (advance + received payments linked to the bill). */
export function computeBillStatuses(
  bills: LedgerBill[],
  payments: LedgerPayment[]
): Record<string, BillStatusInfo> {
  const paidByBill = new Map<string, number>();
  for (const p of payments) {
    if (p.direction !== "received" || !p.billId) continue;
    const k = String(p.billId);
    paidByBill.set(k, (paidByBill.get(k) ?? 0) + paise(p.amount));
  }
  const out: Record<string, BillStatusInfo> = {};
  for (const b of bills) {
    const paidP = paise(b.advanceReceived) + (paidByBill.get(String(b._id)) ?? 0);
    const paid = fromPaise(paidP);
    out[String(b._id)] = {
      billId: String(b._id),
      billNo: b.billNo,
      billDate: iso(b.billDate),
      totalAmount: round2(b.totalAmount),
      paid,
      outstanding: Math.max(0, fromPaise(paise(b.totalAmount) - paidP)),
      status: billStatusOf(b.totalAmount, paid),
    };
  }
  return out;
}

const iso = (d: Date | string): string => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? new Date(0).toISOString() : t.toISOString();
};

// ─── main ───────────────────────────────────────────────────────────────────
export function buildLedger(input: {
  customer: LedgerCustomer;
  bills: LedgerBill[];
  payments: LedgerPayment[];
  consignments: LedgerConsignment[];
  /** Ids of every consignment that is on ANY bill (not only this customer's). */
  billedConsignmentIds: Iterable<string>;
  options?: LedgerOptions;
}): LedgerResult {
  const { customer, bills, payments, consignments } = input;
  const opts = input.options ?? {};
  const includeUnbilled = opts.includeUnbilled ?? true;
  const billedIds = new Set<string>();
  for (const id of input.billedConsignmentIds) billedIds.add(String(id));
  for (const b of bills) for (const it of b.items) billedIds.add(String(it.consignmentId));

  const all: LedgerEntry[] = [];
  const push = (e: Omit<LedgerEntry, "amount" | "date"> & { amount: number; date: Date | string }) => {
    const amount = round2(e.amount);
    if (amount > 0) all.push({ ...e, amount, date: iso(e.date) });
  };

  // 1. opening balance
  push({
    id: `opening:${customer._id}`,
    date: customer.createdAt,
    type: "Opening Balance",
    refNo: "Opening",
    label: "Opening Balance",
    amount: customer.openingBalance,
    side: customer.balanceType === "credit" ? "received" : "receivable",
    source: "opening",
    sourceId: String(customer._id),
    meta: {},
  });

  const billById = new Map(bills.map((b) => [String(b._id), b]));
  const statuses = computeBillStatuses(bills, payments);

  // 2 + 3. bills and their advance
  for (const b of bills) {
    const id = String(b._id);
    push({
      id: `bill:${id}`,
      date: b.billDate,
      type: "Invoice",
      refNo: b.billNo,
      label: "Freight Amount",
      amount: b.totalAmount,
      side: "receivable",
      source: "bill",
      sourceId: id,
      billId: id,
      meta: { items: b.items },
    });
    if (b.advanceReceived > 0) {
      push({
        id: `advance:${id}`,
        date: b.advanceDate || b.billDate,
        type: "Invoice",
        refNo: b.billNo,
        label: "Advance",
        amount: b.advanceReceived,
        side: "received",
        source: "bill_advance",
        sourceId: id,
        billId: id,
        meta: { mode: b.advanceVia ?? "" },
      });
    }
  }

  // 4. payments / manual debits. Chronological so "Final settlement" is the
  // payment that clears the bill.
  const runningPaid = new Map<string, number>();
  for (const b of bills) runningPaid.set(String(b._id), paise(b.advanceReceived));
  const sortedPayments = [...payments].sort((a, z) => new Date(a.date).getTime() - new Date(z.date).getTime());
  for (const p of sortedPayments) {
    if (p.direction === "paid") continue; // supplier-side, not a customer entry
    const billId = p.billId ? String(p.billId) : undefined;
    const bill = billId ? billById.get(billId) : undefined;
    if (p.direction === "receivable_adjustment") {
      push({
        id: `payment:${p._id}`,
        date: p.date,
        type: "Adjustment",
        refNo: p.billNo || bill?.billNo || "Debit",
        label: "Receivable (Debit)",
        amount: p.amount,
        side: "receivable",
        source: "adjustment",
        sourceId: String(p._id),
        billId,
        meta: { mode: p.mode ?? "", reference: p.reference ?? "", remark: p.remark ?? "" },
      });
      continue;
    }
    let label = "Payment";
    if (bill && billId) {
      const paidSoFar = (runningPaid.get(billId) ?? 0) + paise(p.amount);
      runningPaid.set(billId, paidSoFar);
      label = paidSoFar >= paise(bill.totalAmount) ? "Final settlement" : "Part payment";
    }
    push({
      id: `payment:${p._id}`,
      date: p.date,
      type: bill ? "Invoice" : "Payment",
      refNo: p.billNo || bill?.billNo || "Payment",
      label,
      amount: p.amount,
      side: "received",
      source: "payment",
      sourceId: String(p._id),
      billId,
      meta: { mode: p.mode ?? "", reference: p.reference ?? "", remark: p.remark ?? "" },
    });
  }

  // 5 + 6. bilties that are NOT on any bill. A billed bilty is represented
  // only through its bill, so nothing is counted twice. Cancelled bilties are
  // skipped. Receipt and freight are gated together by `includeUnbilled` so
  // toggling never leaves a receipt without the freight it settles.
  if (includeUnbilled) {
    for (const c of consignments) {
      const cid = String(c._id);
      if (billedIds.has(cid) || c.paymentStatus === "Cancelled") continue;
      if (billedPartyName(c) !== normName(customer.name)) continue;
      const receipt = parseMoney(c.receivedMoney);
      // A bilty already marked Paid with no receipt recorded is settled elsewhere.
      if (receipt > 0 || c.paymentStatus !== "Paid") {
        push({
          id: `unbilled:${cid}`,
          date: c.bookingDate,
          type: "Bilty",
          refNo: c.consignmentNumber,
          label: "Freight Amount (Unbilled)",
          amount: c.freight,
          side: "receivable",
          source: "unbilled_bilty",
          sourceId: cid,
          consignmentId: cid,
          meta: {},
        });
      }
      if (receipt > 0) {
        push({
          id: `receipt:${cid}`,
          date: c.receivedDate || c.bookingDate,
          type: "Bilty",
          refNo: c.consignmentNumber,
          label: "Bilty payment",
          amount: receipt,
          side: "received",
          source: "bilty_receipt",
          sourceId: cid,
          consignmentId: cid,
          meta: { mode: c.receivedType ?? "", reference: c.UTRNumber ?? "", mrNumber: c.mrNumber ?? "" },
        });
      }
    }
  }

  // newest first; same date: later-created kinds (received) first
  const order = new Map(all.map((e, i) => [e.id, i]));
  all.sort((a, z) => z.date.localeCompare(a.date) || (order.get(z.id) ?? 0) - (order.get(a.id) ?? 0));

  const net = (list: LedgerEntry[]) => {
    let r = 0;
    let c = 0;
    for (const e of list) {
      if (e.side === "receivable") r += paise(e.amount);
      else c += paise(e.amount);
    }
    return { r, c };
  };
  const overall = net(all);

  const fromT = opts.from ? opts.from.getTime() : null;
  const toT = opts.to ? opts.to.getTime() : null;
  const q = (opts.search ?? "").trim().toLowerCase();
  const type = opts.type ?? "all";
  const entries = all.filter((e) => {
    const t = new Date(e.date).getTime();
    if (fromT !== null && t < fromT) return false;
    if (toT !== null && t > toT) return false;
    if (type !== "all" && e.side !== type) return false;
    if (q) {
      const items = (e.meta.items as { cnsNo: string }[] | undefined) ?? [];
      const hay = [e.refNo, e.label, ...items.map((i) => i.cnsNo)].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const f = net(entries);

  return {
    entries,
    billStatuses: statuses,
    summary: {
      entries: entries.length,
      totalReceivable: fromPaise(f.r),
      totalReceived: fromPaise(f.c),
      netBalance: fromPaise(f.r - f.c),
      overallNetBalance: fromPaise(overall.r - overall.c),
    },
  };
}

// ─── statement ──────────────────────────────────────────────────────────────
export interface StatementRow {
  entry: LedgerEntry;
  /** Running balance after this entry. > 0 = customer owes us (Dr), < 0 = advance (Cr). */
  balance: number;
}

export interface Statement {
  /** Net balance of everything dated before `from` (0 when there is no `from`). */
  broughtForward: number;
  /** Chronological (oldest first), each with its running balance. */
  rows: StatementRow[];
  totalReceivable: number;
  totalReceived: number;
  closingBalance: number;
}

/**
 * Statement for a date range, from a customer's COMPLETE entry list (newest
 * first, as `buildLedger` returns it with no filters). Entries before `from`
 * collapse into one brought-forward figure so the running balance is right
 * even for a partial period. `to` is an inclusive instant.
 */
export function buildStatement(
  entries: LedgerEntry[],
  range: { from?: Date | null; to?: Date | null } = {}
): Statement {
  const fromT = range.from ? range.from.getTime() : null;
  const toT = range.to ? range.to.getTime() : null;

  // Oldest first. On the same date the list puts received first (newest-first
  // order), so reversing gives receivable before received.
  const chronological = [...entries].reverse();

  let bf = 0;
  let running = 0;
  let r = 0;
  let c = 0;
  const rows: StatementRow[] = [];
  for (const entry of chronological) {
    const t = new Date(entry.date).getTime();
    if (toT !== null && t > toT) continue;
    const signed = entry.side === "receivable" ? paise(entry.amount) : -paise(entry.amount);
    if (fromT !== null && t < fromT) {
      bf += signed;
      running += signed;
      continue;
    }
    running += signed;
    if (entry.side === "receivable") r += paise(entry.amount);
    else c += paise(entry.amount);
    rows.push({ entry, balance: fromPaise(running) });
  }

  return {
    broughtForward: fromPaise(bf),
    rows,
    totalReceivable: fromPaise(r),
    totalReceived: fromPaise(c),
    closingBalance: fromPaise(running),
  };
}

/**
 * Running balance AFTER each entry, for a newest-first list that starts at the
 * very top of the ledger with no filter applied. The newest entry's balance is
 * the overall net; each older entry removes the newer entry's effect.
 * > 0 = customer owes us (Dr), < 0 = advance (Cr).
 */
export function runningBalances(entriesNewestFirst: LedgerEntry[], overallNetBalance: number): number[] {
  let running = paise(overallNetBalance);
  return entriesNewestFirst.map((entry) => {
    const after = running;
    running -= entry.side === "receivable" ? paise(entry.amount) : -paise(entry.amount);
    return fromPaise(after);
  });
}
