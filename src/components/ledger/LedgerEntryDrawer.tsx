"use client";

import { useEffect } from "react";
import { Pencil, Trash2, X } from "@/components/icons";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import type { BillStatusInfo, LedgerEntry } from "@/lib/ledger/build-ledger";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { billPdfPath } from "@/lib/bill-pdf-url";
import { entryTitle } from "@/components/ledger/LedgerEntryRow";

interface BillItemMeta {
  cnsNo: string;
  freightAmt: number;
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
}: {
  entry: LedgerEntry | null;
  billStatus?: BillStatusInfo;
  onClose: () => void;
  /** Payments and manual debits only. */
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (entry: LedgerEntry) => void;
  onRecordForBill: (billId: string) => void;
}) {
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  if (!entry) return null;
  const receivable = entry.side === "receivable";
  const editable = entry.source === "payment" || entry.source === "adjustment";
  const canRecordForBill = entry.source === "bill" && Boolean(entry.billId) && (billStatus?.outstanding ?? 0) > 0;
  const items = Array.isArray(entry.meta.items) ? (entry.meta.items as BillItemMeta[]) : [];
  const details: [string, string][] = [
    ["Mode", str(entry.meta.mode)],
    ["UTR / Reference", str(entry.meta.reference)],
    ["MR number", str(entry.meta.mrNumber)],
    ["Remark", str(entry.meta.remark)],
  ].filter((row): row is [string, string] => row[1] !== "");

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Entry details"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl dark:bg-neutral-900"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-500">{formatLedgerDate(entry.date)}</p>
            <h3 className="text-base font-semibold">{entryTitle(entry)}</h3>
            <p className="text-sm text-neutral-500">{entry.label}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        <p className={cn("mt-4 text-2xl font-semibold", receivable ? "text-(--receivable)" : "text-(--received)")}>
          {formatInr(entry.amount)}{" "}
          <span className="text-sm">{receivable ? "Receivable (Dr)" : "Received (Cr)"}</span>
        </p>

        {billStatus && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                billStatus.status === "Paid"
                  ? "bg-(--received-soft) text-(--received)"
                  : billStatus.status === "Partial"
                    ? "bg-(--partial-soft) text-(--partial)"
                    : "bg-(--receivable-soft) text-(--receivable)"
              )}
            >
              {billStatus.status}
            </span>
            <span className="text-neutral-500">
              Outstanding {formatInr(billStatus.outstanding)} of {formatInr(billStatus.totalAmount)}
            </span>
          </div>
        )}
        {billStatus && billStatus.paid > 0 && (
          <p className="mt-1 text-xs text-neutral-500">Paid so far {formatInr(billStatus.paid)}</p>
        )}

        {items.length > 0 && (
          <table className="mt-5 w-full text-sm">
            <caption className="mb-1 text-left text-xs font-medium text-neutral-500">Bilties on this bill</caption>
            <thead>
              <tr className="border-b text-left text-xs text-neutral-500">
                <th className="py-1 font-medium">LR no.</th>
                <th className="py-1 text-right font-medium">Freight</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.cnsNo} className="border-b border-black/5">
                  <td className="py-1">{it.cnsNo}</td>
                  <td className="py-1 text-right">{formatInr(it.freightAmt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {details.length > 0 && (
          <dl className="mt-5 space-y-2 text-sm">
            {details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 space-y-2">
          {canRecordForBill && (
            <Button className="w-full" onClick={() => onRecordForBill(entry.billId as string)}>
              Record payment for this bill
            </Button>
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
          {EDIT_ELSEWHERE[entry.source] && (
            <p className="text-xs text-neutral-500">{EDIT_ELSEWHERE[entry.source]}</p>
          )}
          {entry.billId && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.open(billPdfPath(entry.billId as string), "_blank", "noopener")}
            >
              Open bill PDF
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
