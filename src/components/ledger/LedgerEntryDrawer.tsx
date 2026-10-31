"use client";

import { ArrowDownLeft, ArrowUpRight } from "@/components/ledger/ledger-icons";
import { useEffect } from "react";
import { FileText, Pencil, Trash2, X } from "@/components/icons";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import type { BillStatusInfo, LedgerEntry } from "@/lib/ledger/build-ledger";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { billPdfPath } from "@/lib/bill-pdf-url";
import { entryTitle } from "@/components/ledger/LedgerEntryRow";
import { isIncreaseSide } from "@/lib/ledger/build-ledger";
import { sideStyle } from "@/lib/ledger/party-kind";

interface BillItemMeta {
  cnsNo: string;
  freightAmt?: number;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Where an entry that can't be edited here is changed instead. */
const EDIT_ELSEWHERE: Partial<Record<LedgerEntry["source"], string>> = {
  bill_advance: "This advance is part of the bill. Edit it from the bill.",
  bilty_receipt: "This receipt comes from the bilty. Edit it from the bilty.",
};

export function LedgerEntryDrawer({
  entry,
  billStatus,
  onClose,
  onEdit,
  onDelete,
  onRecordForBill,
  onEditContract,
  onDeleteContract,
}: {
  entry: LedgerEntry | null;
  billStatus?: BillStatusInfo;
  onClose: () => void;
  /** Payments and manual debits only. */
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (entry: LedgerEntry) => void;
  /** Bill id (customer) or contract id (supplier). */
  onRecordForBill: (docId: string) => void;
  /** Supplier contract entries only. */
  onEditContract?: (entry: LedgerEntry) => void;
  onDeleteContract?: (entry: LedgerEntry) => void;
}) {
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  if (!entry) return null;
  const receivable = isIncreaseSide(entry.side); // raises the balance (receivable / payable)
  const style = sideStyle(entry.side);
  const isContract = entry.source === "contract";
  const docId = entry.billId ?? entry.contractId;
  const editable = entry.source === "payment" || entry.source === "adjustment";
  const canRecordForBill =
    (entry.source === "bill" || isContract) && Boolean(docId) && (billStatus?.outstanding ?? 0) > 0;
  const items = Array.isArray(entry.meta.items) ? (entry.meta.items as BillItemMeta[]) : [];
  const money = (key: string): string => {
    const v = entry.meta[key];
    return typeof v === "number" && v > 0 ? formatInr(v) : "";
  };
  const details: [string, string][] = [
    ["Date", formatLedgerDate(entry.date)],
    ...(isContract
      ? ([
          ["Vehicle", str(entry.meta.vehicleNo)],
          ["Hire amount", money("hireAmount")],
          ["Other charges", money("otherCharges")],
          ["Deductions", money("deductions")],
          ["TDS withheld (not paid in cash)", money("tdsAmount")],
        ] as [string, string][])
      : []),
    ["Mode", str(entry.meta.mode)],
    ["UTR / Reference", str(entry.meta.reference)],
    ["MR number", str(entry.meta.mrNumber)],
    ["Remark", str(entry.meta.remark)],
  ].filter((row): row is [string, string] => row[1] !== "");
  const Icon = receivable ? (entry.type === "Invoice" || entry.type === "Bilty" || entry.type === "Contract" ? FileText : ArrowUpRight) : ArrowDownLeft;
  const paidPct = billStatus && billStatus.totalAmount > 0 ? Math.min(100, (billStatus.paid / billStatus.totalAmount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-[1px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Entry details"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-(--ledger-card) shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-(--ledger-line) p-5">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              style.softText
            )}
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{entryTitle(entry)}</h3>
            <p className="text-sm text-neutral-500">{entry.label}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-lg p-1.5 text-neutral-500 hover:bg-(--ledger-surface)">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className={cn("rounded-2xl p-4", style.soft)}>
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {style.short} ({style.code})
            </p>
            <p className={cn("mt-0.5 text-3xl font-bold tabular-nums", style.text)}>
              {formatInr(entry.amount)}
            </p>
          </div>

          {billStatus && (
            <section aria-label="Bill status" className="rounded-xl border border-(--ledger-line) p-3">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    billStatus.status === "Paid"
                      ? "bg-(--received-soft) text-(--received)"
                      : billStatus.status === "Partial"
                        ? "bg-(--partial-soft) text-(--partial)"
                        : "bg-(--receivable-soft) text-(--receivable)"
                  )}
                >
                  {billStatus.status}
                </span>
                <span className="text-xs text-neutral-500">{isContract || entry.contractId ? "Contract" : "Bill"} total {formatInr(billStatus.totalAmount)}</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--ledger-surface)" aria-hidden="true">
                <div className="h-full rounded-full bg-(--received)" style={{ width: `${paidPct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-neutral-500">
                <span>Paid {formatInr(billStatus.paid)}</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">Outstanding {formatInr(billStatus.outstanding)}</span>
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">{isContract ? "LR numbers on this contract" : "Bilties on this bill"}</h4>
              <ul className="divide-y divide-(--ledger-line) rounded-xl border border-(--ledger-line)">
                {items.map((it) => (
                  <li key={it.cnsNo} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>LR {it.cnsNo}</span>
                    {typeof it.freightAmt === "number" && <span className="tabular-nums">{formatInr(it.freightAmt)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {details.length > 0 && (
            <dl className="space-y-2 text-sm">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {EDIT_ELSEWHERE[entry.source] && <p className="text-xs text-neutral-500">{EDIT_ELSEWHERE[entry.source]}</p>}
        </div>

        <div className="space-y-2 border-t border-(--ledger-line) p-4">
          {canRecordForBill && (
            <Button className="w-full" onClick={() => onRecordForBill(docId as string)}>
              {isContract ? "Record payment for this contract" : "Record payment for this bill"}
            </Button>
          )}
          {entry.billId && (
            <Button className="w-full" variant="outline" onClick={() => window.open(billPdfPath(entry.billId as string), "_blank", "noopener")}>
              <FileText size={16} aria-hidden="true" /> Open bill PDF
            </Button>
          )}
          {isContract && onEditContract && onDeleteContract && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onEditContract(entry)}>
                <Pencil size={16} aria-hidden="true" /> Edit contract
              </Button>
              <Button variant="outline" className="text-(--receivable)" onClick={() => onDeleteContract(entry)}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </Button>
            </div>
          )}
          {editable && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onEdit(entry)}>
                <Pencil size={16} aria-hidden="true" /> Edit
              </Button>
              <Button variant="outline" className="text-(--receivable)" onClick={() => onDelete(entry)}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
