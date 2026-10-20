"use client";

import { ArrowRight, CalendarDays, Copy, FileText, Hash, MoreHorizontal, UserRound } from "lucide-react";
import { Pencil, Printer, Trash2, Truck } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import type { FreightBillRecord } from "@/lib/bill/api";
import { computeBillSummary, computeBillTotals } from "@/lib/bill/validations";
import { formatDate, formatINR } from "@/lib/lr-helpers";
import { ActionBtn, ActionMenu, ACTION_CLS, Field } from "@/components/bookings/LrCard";
import { MenuDivider, MenuItem } from "@/components/bookings/Menu";

export interface BillCardActions {
  open: (b: FreightBillRecord) => void;
  print: (b: FreightBillRecord) => void;
  copyDetails: (b: FreightBillRecord) => void;
  remove: (b: FreightBillRecord) => void;
}

type BillState = "Paid" | "Part paid" | "Billed";

const STRIP: Record<BillState, string> = {
  Paid: "bg-green-600",
  "Part paid": "bg-amber-500",
  Billed: "bg-blue-500",
};

const PARTY_VARIANT: Record<string, "brand" | "info" | "neutral"> = {
  Consignor: "brand",
  Consignee: "info",
  "Third Party": "neutral",
};

const MAX_CHIPS = 4;

/**
 * One freight bill, laid out like the LR cards on the bookings page:
 * coloured status strip, identity row, three-column body and an action bar.
 * "Paid / Part paid" comes from the advance recorded on the bill (bills don't track later payments).
 */
export function BillCard({ bill, actions }: { bill: FreightBillRecord; actions: BillCardActions }) {
  const items = bill.items ?? [];
  const tripTotal = computeBillTotals(items).totalCharges;
  const s = computeBillSummary(tripTotal, bill.adjustments);
  const invoice = Number(bill.totalAmount ?? s.invoiceAmount);
  const advance = s.advance;
  const balance = Math.max(0, invoice - advance);
  const state: BillState = advance > 0 && balance === 0 ? "Paid" : advance > 0 ? "Part paid" : "Billed";
  const paidPct = invoice > 0 ? Math.min(100, Math.round((advance / invoice) * 100)) : 0;

  const first = items[0];
  const extraRoutes = new Set(items.slice(1).map((i) => `${i.bookingStn}|${i.toStn}`)).size;
  const party = bill.billedTo;
  const partyLine = [party?.city, party?.state].filter(Boolean).join(", ");

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open bill ${bill.billNo}`}
      onClick={() => actions.open(bill)}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) actions.open(bill); }}
      className="group relative cursor-pointer rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {/* vertical status label */}
      <div
        className={`absolute inset-y-0 left-0 flex w-8 items-center justify-center rounded-l-xl text-[11px] font-semibold uppercase tracking-widest text-white ${STRIP[state]}`}
        aria-hidden="true"
      >
        <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{state}</span>
      </div>

      <div className="px-4 pb-3 pl-12 pt-3.5">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h3 className="truncate text-lg font-semibold tracking-tight text-neutral-900">Bill {bill.billNo}</h3>
            <span className="inline-flex items-center gap-1 text-body-sm text-neutral-500">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(bill.billDate)}
            </span>
            {bill.billStn && <span className="text-caption font-medium text-neutral-500">STN {bill.billStn}</span>}
            <span className="hidden items-center gap-1 text-caption font-medium text-brand-700 opacity-0 transition group-hover:opacity-100 sm:inline-flex">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> View bill
            </span>
          </div>
          <Badge variant={PARTY_VARIANT[bill.billedToType] ?? "neutral"}>Billed to {bill.billedToType}</Badge>
        </div>

        {/* body */}
        <div className="mt-3 grid gap-4 border-t border-neutral-100 pt-3 md:grid-cols-2 lg:grid-cols-[1.1fr_1.2fr_1fr]">
          {/* route + LRs */}
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Route</p>
              <div className="mt-0.5 flex items-center gap-2 text-body-md font-semibold text-neutral-900">
                <span className="truncate">{first?.bookingStn || "--"}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                <span className="truncate">{first?.toStn || "--"}</span>
              </div>
              {extraRoutes > 0 && <p className="mt-0.5 text-caption text-neutral-500">+{extraRoutes} more route{extraRoutes > 1 ? "s" : ""}</p>}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {items.length} LR{items.length === 1 ? "" : "s"} on this bill
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {items.slice(0, MAX_CHIPS).map((i) => (
                  <span key={i.consignmentId} className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-2 py-0.5 text-caption font-medium text-neutral-700">
                    <Hash className="h-3 w-3 text-neutral-400" aria-hidden="true" />{i.cnsNo}
                  </span>
                ))}
                {items.length > MAX_CHIPS && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-caption font-medium text-neutral-500">+{items.length - MAX_CHIPS}</span>
                )}
              </div>
            </div>
          </div>

          {/* billed party */}
          <div className="min-w-0 space-y-2.5">
            <Field icon={<UserRound />} label="Billed to" value={party?.name} />
            <Field icon={<FileText />} label="GSTIN" value={party?.gstin} />
            {partyLine && <p className="pl-8 text-caption text-neutral-500">{partyLine}</p>}
          </div>

          {/* vehicle + amount */}
          <div className="min-w-0 md:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end lg:gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-body-sm font-medium text-neutral-800">
                <Truck className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                {bill.vehicleNumber || "No vehicle"}
              </span>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Invoice amount</p>
                <p className="text-xl font-semibold leading-tight text-neutral-900">{formatINR(invoice)}</p>
              </div>
            </div>
            {invoice > 0 && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label="Advance received">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[12px]">
                  <span className={advance > 0 ? "text-green-700" : "text-neutral-400"}>Advance {formatINR(advance)}</span>
                  <span className={balance > 0 ? "font-medium text-red-600" : "text-neutral-400"}>Payable {formatINR(balance)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* action bar */}
      <div
        className="flex flex-wrap items-center gap-1 rounded-b-xl border-t border-neutral-100 bg-neutral-50/80 px-3 py-2 pl-11"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ActionBtn icon={<Printer />} label="Print" tone="brand" onClick={() => actions.print(bill)} />
        <ActionBtn icon={<Pencil />} label="Edit" href={`/admin/billing/new?id=${bill._id}`} />

        <ActionMenu trigger={<><MoreHorizontal /> More</>} className={`${ACTION_CLS} ml-auto`}>
          <MenuItem icon={<FileText />} onClick={() => actions.open(bill)}>View bill</MenuItem>
          <MenuItem icon={<Copy />} onClick={() => actions.copyDetails(bill)}>Copy details</MenuItem>
          <MenuDivider />
          <MenuItem icon={<Trash2 />} danger onClick={() => actions.remove(bill)}>Delete</MenuItem>
        </ActionMenu>
      </div>
    </article>
  );
}

export function BillCardSkeleton() {
  return (
    <div className="relative animate-pulse rounded-xl border border-neutral-200 bg-white shadow-sm">
      <span className="absolute inset-y-0 left-0 w-8 rounded-l-xl bg-neutral-200" />
      <div className="space-y-4 px-4 pb-3 pl-12 pt-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded bg-neutral-200" />
          <div className="h-6 w-32 rounded-full bg-neutral-200" />
        </div>
        <div className="grid gap-4 border-t border-neutral-100 pt-3 lg:grid-cols-[1.1fr_1.2fr_1fr]">
          <div className="space-y-3"><div className="h-5 w-3/4 rounded bg-neutral-200" /><div className="h-4 w-full rounded bg-neutral-100" /></div>
          <div className="space-y-3"><div className="h-8 w-2/3 rounded bg-neutral-100" /><div className="h-8 w-2/3 rounded bg-neutral-100" /></div>
          <div className="space-y-2"><div className="ml-auto h-6 w-28 rounded bg-neutral-200" /><div className="h-1.5 w-full rounded bg-neutral-200" /></div>
        </div>
      </div>
      <div className="h-11 rounded-b-xl border-t border-neutral-100 bg-neutral-50" />
    </div>
  );
}
