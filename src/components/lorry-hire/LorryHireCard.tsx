"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Calculator, MoreHorizontal, Pencil, Printer, Share2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LorryTruckIcon } from "@/components/lorry-hire/LorryTruckIcon";
import type { LorryHireRecord } from "@/lib/lorry-hire/api";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import { canCancelLorryHire, canTransitionLorryHire } from "@/lib/lorry-hire/status";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** "2026-10-27T…" -> "27-10-2026" (the date part only, so the timezone can't shift it). */
const fmtDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10).split("-").reverse().join("-") : "—");
const place = (p: { location: string; state?: string }) => [p.location, p.state].filter(Boolean).join(", ");

const STATUS_VARIANT = { Hired: "info", "In Transit": "warning", Delivered: "success", Cancelled: "error" } as const;
const PAY_TEXT = { Unpaid: "Pending", Partial: "Partial", Paid: "Paid" } as const;
const PAY_COLOR = { Unpaid: "text-orange-600", Partial: "text-amber-600", Paid: "text-green-600" } as const;

const ACTION =
  "inline-flex items-center gap-1.5 text-body-sm font-medium text-blue-600 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:text-neutral-300 [&>svg]:h-5 [&>svg]:w-5";

export interface LorryHireCardActions {
  /** Opens the payment dialog (the contract's account). */
  addPayment: (r: LorryHireRecord) => void;
  markInTransit: (r: LorryHireRecord) => void;
  markDelivered: (r: LorryHireRecord) => void;
  cancel: (r: LorryHireRecord) => void;
  /** Opens the contract's PDF (stored copy when current, built once otherwise). */
  print: (r: LorryHireRecord) => void;
  /** Opens the Share dialog (PDF download, WhatsApp, copy link). */
  share: (r: LorryHireRecord) => void;
}

/** "⋯" menu for the less common actions, so the main row stays like the old app's. */
function MoreMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={ACTION}>
        <MoreHorizontal aria-hidden="true" /> More
      </button>
      {open && (
        <div role="menu" onClick={() => setOpen(false)} className="absolute bottom-full left-0 z-20 mb-1 min-w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

const MENU_ITEM = "block w-full px-3 py-2 text-left text-body-sm text-neutral-700 hover:bg-neutral-50";

export function LorryHireCard({ r, actions }: { r: LorryHireRecord; actions: LorryHireCardActions }) {
  const cancelled = r.status === "Cancelled";
  const cancelCheck = canCancelLorryHire(r.status, r.settlement.totalPaid);
  const pay = r.settlement.paymentStatus;
  const paid = pay === "Paid";
  const ownerName = r.owner?.sameAsSupplier ? r.supplier.name : r.owner?.name;
  const ownerMobile = r.owner?.sameAsSupplier ? r.supplier.mobile : r.owner?.mobile;

  return (
    <article className="rounded-md border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      {/* Row 1 — number, date, who pays the freight */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <p className="text-body-sm text-neutral-500">
          LHC No. <Link href={`/admin/lorry-hire/new?id=${r._id}`} className="font-semibold text-neutral-800 hover:text-brand-700">{r.lhcNo}</Link>
          <Badge variant={STATUS_VARIANT[r.status]} className="ml-2 align-middle">{r.status}</Badge>
        </p>
        <p className="text-body-sm text-neutral-500">
          Date: <span className="ml-1 font-medium text-neutral-800">[{fmtDate(r.lhcDate)}]</span>
        </p>
        <p className="flex items-center gap-2 text-body-sm text-neutral-500">
          Payment By
          <span className="bg-blue-500 px-2 py-0.5 text-[13px] font-medium uppercase text-white">{r.freight?.freightPaidBy ?? "—"}</span>
        </p>
      </div>

      {/* Row 2 — truck + route, supplier + owner */}
      <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex items-center gap-3">
          <LorryTruckIcon />
          <div className="min-w-0 flex-1">
            <Link href={`/admin/lorry-hire/new?id=${r._id}`} className="text-lg font-bold tracking-wide text-blue-600 hover:text-blue-800">
              {formatVehicleNumber(r.truck.vehicleNumber)}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-neutral-700">
              <span className="min-w-0 truncate">{place(r.from)}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 text-neutral-400">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate">{place(r.to)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-body-sm text-neutral-700">
          <p><span className="text-neutral-500">Supplier :</span> <span className="uppercase">{r.supplier.name}</span></p>
          <p>
            <span className="text-neutral-500">Owner :</span>{" "}
            <span className="uppercase">{ownerName || ""}</span>{ownerMobile ? ` (${ownerMobile})` : ""}
          </p>
          {!cancelled && (
            <p className="text-caption text-neutral-500">
              Net {inr(r.settlement.netPayable)} ·{" "}
              <span className={r.settlement.balance > 0 ? "font-medium text-error-700" : "font-medium text-success-700"}>
                Balance {inr(r.settlement.balance)}
              </span>
              {r.items.length > 0 && <> · {r.items.length} LR{r.items.length > 1 ? "s" : ""}</>}
            </p>
          )}
        </div>
      </div>

      {/* Row 3 — actions + payment status */}
      <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-neutral-100 pt-3">
        {!cancelled && (
          <button type="button" className={ACTION} disabled={r.settlement.balance <= 0} onClick={() => actions.addPayment(r)} title={r.settlement.balance <= 0 ? "Fully paid" : "Record a payment"}>
            <Calculator aria-hidden="true" /> Account
          </button>
        )}
        {!cancelled && (
          <Link href={`/admin/lorry-hire/new?id=${r._id}`} className={ACTION}>
            <Pencil aria-hidden="true" /> Edit
          </Link>
        )}
        <button type="button" className={ACTION} onClick={() => actions.print(r)}>
          <Printer aria-hidden="true" /> Print
        </button>
        <button type="button" className={ACTION} onClick={() => actions.share(r)}>
          <Share2 aria-hidden="true" /> Share
        </button>
        {!cancelled && (
          <button
            type="button"
            className={cn(ACTION, "!text-red-600 hover:!text-red-800 disabled:!text-neutral-300")}
            disabled={!cancelCheck.ok}
            title={cancelCheck.reason}
            onClick={() => actions.cancel(r)}
          >
            <X aria-hidden="true" /> Cancel
          </button>
        )}
        {!cancelled && (
          <MoreMenu>
            <Link href={`/admin/lorry-hire/new?copy=${r._id}`} className={MENU_ITEM} role="menuitem">Duplicate</Link>
            {canTransitionLorryHire(r.status, "In Transit") && r.status !== "In Transit" && (
              <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => actions.markInTransit(r)}>
                {r.status === "Delivered" ? "Back to in transit" : "Mark in transit"}
              </button>
            )}
            {r.status !== "Delivered" && (
              <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => actions.markDelivered(r)}>Mark delivered</button>
            )}
          </MoreMenu>
        )}

        {cancelled ? (
          r.cancelReason && <p className="text-caption text-neutral-500 sm:ml-auto">Reason: {r.cancelReason}</p>
        ) : (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-body-sm text-neutral-800">Payment Status</span>
            <button
              type="button"
              role="switch"
              aria-checked={paid}
              aria-label={paid ? "Fully paid" : "Record a payment"}
              title={paid ? "Fully paid" : "Record a payment"}
              disabled={paid}
              onClick={() => actions.addPayment(r)}
              className={cn(
                "relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors disabled:cursor-default",
                paid ? "bg-green-500" : "bg-sky-100 hover:bg-sky-200"
              )}
            >
              <span className={cn("inline-block h-3.5 w-3.5 rounded-full shadow transition-transform", paid ? "translate-x-[22px] bg-white" : "translate-x-1 bg-neutral-400")} />
            </button>
            <span className={cn("min-w-14 text-body-md font-medium", PAY_COLOR[pay])}>{PAY_TEXT[pay]}</span>
          </div>
        )}
      </div>

      {r.preparedBy && (
        <p className="mt-1 text-right text-[11px] text-blue-500">Created By : {r.preparedBy}</p>
      )}
    </article>
  );
}

export function LorryHireCardSkeleton() {
  return (
    <div className="animate-pulse border border-neutral-200 bg-white p-4">
      <div className="h-4 w-40 bg-neutral-100" />
      <div className="mt-3 h-3 w-64 bg-neutral-100" />
      <div className="mt-4 h-3 w-48 bg-neutral-100" />
    </div>
  );
}
