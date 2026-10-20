"use client";

import Link from "next/link";
import { CalendarDays, Copy, FileText, Hash, Truck, UserRound } from "lucide-react";
import { Pencil, Printer, Trash2 } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import type { FreightBillRecord } from "@/lib/bill/api";
import { formatDate, formatINR } from "@/lib/lr-helpers";

export interface BillCardActions {
  open: (b: FreightBillRecord) => void;
  print: (b: FreightBillRecord) => void;
  copyDetails: (b: FreightBillRecord) => void;
  remove: (b: FreightBillRecord) => void;
}

const PARTY_VARIANT: Record<string, "brand" | "info" | "neutral"> = {
  Consignor: "brand",
  Consignee: "info",
  "Third Party": "neutral",
};

const MAX_CHIPS = 5;

const ICON_BTN =
  "focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-700 [&>svg]:h-4 [&>svg]:w-4";

/**
 * Compact freight-bill card: amount tile on the left, party and LR chips in the
 * middle, quick actions on the right. Deliberately lighter than the bilty card.
 */
export function BillCard({ bill, actions }: { bill: FreightBillRecord; actions: BillCardActions }) {
  const items = bill.items ?? [];
  const party = bill.billedTo;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open bill ${bill.billNo}`}
      onClick={() => actions.open(bill)}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) actions.open(bill); }}
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex-row sm:items-center sm:gap-4"
    >
      {/* amount tile */}
      <div className="flex shrink-0 items-center gap-3 sm:w-40 sm:flex-col sm:items-start sm:gap-0.5 sm:border-r sm:border-neutral-100 sm:pr-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:mb-1">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Bill amount</p>
          <p className="text-lg font-bold leading-tight text-neutral-900">{formatINR(bill.totalAmount)}</p>
        </div>
      </div>

      {/* details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-base font-semibold text-neutral-900">Bill {bill.billNo}</h3>
          <Badge variant={PARTY_VARIANT[bill.billedToType] ?? "neutral"}>{bill.billedToType}</Badge>
          <span className="inline-flex items-center gap-1 text-caption text-neutral-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(bill.billDate)}
          </span>
          {bill.billStn && <span className="text-caption text-neutral-400">STN {bill.billStn}</span>}
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 truncate text-body-sm font-medium text-neutral-800">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          <span className="truncate">{party?.name || "—"}</span>
          {party?.gstin && <span className="hidden shrink-0 text-caption font-normal text-neutral-400 sm:inline">· {party.gstin}</span>}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-neutral-500">{items.length} LR{items.length === 1 ? "" : "s"}:</span>
          {items.slice(0, MAX_CHIPS).map((i) => (
            <span key={i.consignmentId} className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-caption font-medium text-neutral-700">
              <Hash className="h-3 w-3 text-neutral-400" aria-hidden="true" />{i.cnsNo}
            </span>
          ))}
          {items.length > MAX_CHIPS && <span className="text-caption text-neutral-500">+{items.length - MAX_CHIPS} more</span>}
          {bill.vehicleNumber && (
            <span className="ml-1 inline-flex items-center gap-1 text-caption text-neutral-500">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />{bill.vehicleNumber}
            </span>
          )}
        </div>
      </div>

      {/* actions */}
      <div
        className="flex shrink-0 items-center gap-0.5 self-end sm:self-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button type="button" className={ICON_BTN} aria-label="Print bill" title="Print" onClick={() => actions.print(bill)}><Printer /></button>
        <Link href={`/admin/billing/new?id=${bill._id}`} className={ICON_BTN} aria-label="Edit bill" title="Edit"><Pencil /></Link>
        <button type="button" className={ICON_BTN} aria-label="Copy bill details" title="Copy details" onClick={() => actions.copyDetails(bill)}><Copy /></button>
        <button type="button" className={`${ICON_BTN} hover:!bg-red-50 hover:!text-red-600`} aria-label="Delete bill" title="Delete" onClick={() => actions.remove(bill)}><Trash2 /></button>
      </div>
    </article>
  );
}

export function BillCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="w-40 space-y-2">
        <div className="h-10 w-10 rounded-xl bg-neutral-200" />
        <div className="h-5 w-24 rounded bg-neutral-200" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-5 w-1/2 rounded bg-neutral-200" />
        <div className="h-4 w-2/3 rounded bg-neutral-100" />
        <div className="h-4 w-1/3 rounded bg-neutral-100" />
      </div>
    </div>
  );
}
