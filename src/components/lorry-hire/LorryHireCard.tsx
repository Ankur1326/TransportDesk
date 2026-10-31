"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { Truck } from "@/components/icons";
import type { LorryHireRecord } from "@/lib/lorry-hire/api";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import { canCancelLorryHire, canTransitionLorryHire } from "@/lib/lorry-hire/status";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const STATUS_VARIANT = { Hired: "info", "In Transit": "warning", Delivered: "success", Cancelled: "error" } as const;
const PAY_VARIANT = { Unpaid: "error", Partial: "warning", Paid: "success" } as const;

export interface LorryHireCardActions {
  addPayment: (r: LorryHireRecord) => void;
  markInTransit: (r: LorryHireRecord) => void;
  markDelivered: (r: LorryHireRecord) => void;
  cancel: (r: LorryHireRecord) => void;
}

export function LorryHireCard({ r, actions }: { r: LorryHireRecord; actions: LorryHireCardActions }) {
  const cancelled = r.status === "Cancelled";
  const cancelCheck = canCancelLorryHire(r.status, r.settlement.totalPaid);

  return (
    <article className="border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/lorry-hires/${r._id}`} className="text-base font-semibold text-neutral-900 hover:text-brand-700">
              {r.lhcNo}
            </Link>
            <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
            {!cancelled && <Badge variant={PAY_VARIANT[r.settlement.paymentStatus]}>{r.settlement.paymentStatus}</Badge>}
          </div>
          <p className="mt-1 text-body-sm text-neutral-700">
            {r.from.location} → {r.to.location}
            <span className="text-neutral-400"> · </span>
            {fmtDate(r.lhcDate)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-caption text-neutral-500">Net payable</p>
          <p className="text-base font-semibold tabular-nums text-neutral-900">{inr(r.settlement.netPayable)}</p>
          {!cancelled && (
            <p className={`text-caption tabular-nums ${r.settlement.balance > 0 ? "text-error-700" : "text-success-700"}`}>
              Balance {inr(r.settlement.balance)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-body-sm text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          <span className="font-medium text-neutral-800">{formatVehicleNumber(r.truck.vehicleNumber)}</span>
        </span>
        <span>{r.supplier.name}</span>
        {r.driver?.name && <span>Driver: {r.driver.name}{r.driver.mobile ? ` · ${r.driver.mobile}` : ""}</span>}
        {r.items.length > 0 && <span>{r.items.length} LR{r.items.length > 1 ? "s" : ""}: {r.items.slice(0, 3).map((i) => i.cnNo).join(", ")}{r.items.length > 3 ? "…" : ""}</span>}
      </div>

      {!cancelled && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          <Link href={`/admin/lorry-hires/${r._id}`}><Button size="sm" variant="outline">Edit</Button></Link>
          <Button size="sm" variant="outline" disabled={r.settlement.balance <= 0} onClick={() => actions.addPayment(r)}>
            Add payment
          </Button>
          {canTransitionLorryHire(r.status, "In Transit") && r.status !== "In Transit" && (
            <Button size="sm" variant="ghost" onClick={() => actions.markInTransit(r)}>
              {r.status === "Delivered" ? "Back to in transit" : "Mark in transit"}
            </Button>
          )}
          {r.status !== "Delivered" && (
            <Button size="sm" variant="ghost" onClick={() => actions.markDelivered(r)}>Mark delivered</Button>
          )}
          <Link href={`/admin/lorry-hires/new?copy=${r._id}`}><Button size="sm" variant="ghost">Duplicate</Button></Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-error-700"
            disabled={!cancelCheck.ok}
            title={cancelCheck.reason}
            onClick={() => actions.cancel(r)}
          >
            Cancel
          </Button>
        </div>
      )}
      {cancelled && r.cancelReason && <p className="mt-2 text-caption text-neutral-500">Reason: {r.cancelReason}</p>}
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
