"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Calculator, Copy, Eye as EyeIcon, FileCheck2, Link2, MapPin, MessageCircle, MoreHorizontal,
  PackageCheck, RefreshCcw, Share2, Upload, XCircle,
} from "lucide-react";
import { ChevronRight, Eye, Pencil, Printer, Trash2, Truck } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import type { LrStatus } from "@/lib/consignment-status";
import { balanceDue, formatDate, formatINR, getStatus, lrTotal, receivedAmount } from "@/lib/lr-helpers";
import { Menu, MenuDivider, MenuItem } from "./Menu";

export interface LrCardActions {
  open: (r: ConsignmentListItem) => void;
  account: (r: ConsignmentListItem) => void;
  podUpload: (r: ConsignmentListItem) => void;
  podView: (r: ConsignmentListItem) => void;
  podRemove: (r: ConsignmentListItem) => void;
  shareWhatsApp: (r: ConsignmentListItem) => void;
  copyLink: (r: ConsignmentListItem) => void;
  copyDetails: (r: ConsignmentListItem) => void;
  viewDetails: (r: ConsignmentListItem) => void;
  printCopies: (r: ConsignmentListItem) => void;
  duplicate: (r: ConsignmentListItem) => void;
  setStatus: (r: ConsignmentListItem, s: LrStatus) => void;
  cancel: (r: ConsignmentListItem) => void;
  remove: (r: ConsignmentListItem) => void;
}

const STRIP: Record<LrStatus, string> = {
  Booked: "bg-amber-500",
  "On Route": "bg-blue-500",
  Delivered: "bg-green-600",
  Cancelled: "bg-red-500",
};

const PAY_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  Paid: "success", "Partially Paid": "warning", Pending: "error", Cancelled: "neutral",
};

function Tracker({ status }: { status: LrStatus }) {
  if (status === "Cancelled") {
    return (
      <div className="flex items-center gap-2 text-body-sm font-semibold text-red-600">
        <MapPin className="h-5 w-5" aria-hidden="true" /> ——— Cancelled ———
      </div>
    );
  }
  const pct = status === "Booked" ? 4 : status === "On Route" ? 50 : 100;
  return (
    <div className="w-full max-w-xs">
      <p className="text-center text-[10px] text-neutral-500">{status}</p>
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
        <div className="relative h-1.5 flex-1 rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
          <Truck className="absolute -top-2.5 h-5 w-5 text-blue-600"
            style={{ left: `calc(${pct}% - ${(pct / 100) * 20}px)` }} aria-hidden="true" />
        </div>
        <PackageCheck className={`h-5 w-5 shrink-0 ${status === "Delivered" ? "text-green-600" : "text-neutral-400"}`}
          aria-hidden="true" />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, href, disabled }: {
  icon: ReactNode; label: string; onClick?: () => void; href?: string; disabled?: boolean;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium transition [&>svg]:h-4 [&>svg]:w-4 ${
    disabled ? "cursor-not-allowed bg-neutral-100 text-neutral-400" : "text-sky-600 hover:bg-sky-50"
  }`;
  if (href && !disabled) return <Link href={href} className={cls}>{icon}{label}</Link>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{icon}{label}</button>;
}

export function LrCard({
  item, selected, onSelect, busy, actions,
}: {
  item: ConsignmentListItem;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  busy?: boolean;
  actions: LrCardActions;
}) {
  const status = getStatus(item);
  const cancelled = status === "Cancelled";
  const pay = cancelled ? "Cancelled" : item.payment?.status || "Pending";
  const total = lrTotal(item);
  const received = receivedAmount(item);
  const balance = balanceDue(item);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Open LR ${item.consignmentNumber}`}
      onClick={() => actions.open(item)}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) actions.open(item); }}
      className={`flex cursor-pointer overflow-visible rounded-lg border bg-white shadow-sm transition hover:shadow-md ${
        selected ? "border-brand-600 ring-1 ring-brand-600" : "border-neutral-200"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <div className={`flex w-7 shrink-0 items-center justify-center rounded-l-lg text-[11px] font-semibold uppercase tracking-wide text-white ${STRIP[status]}`}>
        <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{status}</span>
      </div>

      <div className="min-w-0 flex-1 p-4">
        {/* row 1 */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-neutral-500">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              aria-label={`Select LR ${item.consignmentNumber}`}
              className="h-4 w-4 cursor-pointer accent-brand-700"
            />
            <span>
              LR Number : <b className="text-neutral-900">{item.consignmentNumber}</b>
              <span className="ml-1 font-medium text-neutral-800">[{formatDate(item.bookingDate)}]</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            Payment Status : <Badge variant={PAY_VARIANT[pay] ?? "neutral"}>{pay}</Badge>
          </div>
        </div>

        {/* route / parties / vehicle / tracker */}
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 text-body-sm text-neutral-500">
            <div className="flex items-center gap-3 font-semibold text-neutral-800">
              <span>{item.from?.location || "--"}</span>
              <ChevronRight className="h-5 w-5 rounded-full border border-neutral-400 text-neutral-500" aria-hidden="true" />
              <span>{item.to?.location || "--"}</span>
            </div>
            <div>Consignor : <span className="text-neutral-800">{item.consignor?.name || ""}</span></div>
            <div>Consignee : <span className="text-neutral-800">{item.consignee?.name || ""}</span></div>
            {cancelled && item.cancelReason && (
              <div className="text-red-600">Reason : {item.cancelReason}</div>
            )}
            {status === "Delivered" && item.deliveredAt && (
              <div className="text-green-700">Delivered on {formatDate(item.deliveredAt)}</div>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-body-sm text-neutral-500 md:text-right">
              Vehicle No : <span className="font-medium text-neutral-800">{item.vehicleNumber || ""}</span>
              <span className="mx-2">•</span>
              <span className="font-semibold text-neutral-900">{formatINR(total)}</span>
              {!cancelled && (received > 0 || balance > 0) && (
                <div className="text-[12px]">
                  {received > 0 && <span className="text-green-700">Received {formatINR(received)}</span>}
                  {received > 0 && balance > 0 && <span className="mx-1">·</span>}
                  {balance > 0 && <span className="text-red-600">Balance {formatINR(balance)}</span>}
                </div>
              )}
            </div>
            <Tracker status={status} />
          </div>
        </div>

        {/* actions */}
        <div
          className="mt-3 flex flex-wrap items-center justify-around gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {!cancelled && <ActionBtn icon={<Calculator />} label="Account" onClick={() => actions.account(item)} />}

          {item.podUrl ? (
            <Menu trigger={<><FileCheck2 /> POD</>}>
              <MenuItem icon={<EyeIcon />} onClick={() => actions.podView(item)}>View POD</MenuItem>
              {!cancelled && <MenuItem icon={<RefreshCcw />} onClick={() => actions.podUpload(item)}>Replace POD</MenuItem>}
              <MenuItem icon={<Trash2 />} danger onClick={() => actions.podRemove(item)}>Remove POD</MenuItem>
            </Menu>
          ) : (
            <ActionBtn icon={<Upload />} label="Upload POD" onClick={() => actions.podUpload(item)} disabled={cancelled} />
          )}

          <ActionBtn icon={<Pencil />} label="Edit" href={`/admin/consignment/new?id=${item._id}`} disabled={cancelled} />

          <Menu trigger={<><Share2 /> Share</>}>
            <MenuItem icon={<MessageCircle />} onClick={() => actions.shareWhatsApp(item)}>WhatsApp (details + link)</MenuItem>
            <MenuItem icon={<Link2 />} onClick={() => actions.copyLink(item)}>Copy LR link</MenuItem>
            <MenuItem icon={<Copy />} onClick={() => actions.copyDetails(item)}>Copy details</MenuItem>
          </Menu>

          <Menu trigger={<><MoreHorizontal /> More</>}>
            <MenuItem icon={<Eye />} onClick={() => actions.viewDetails(item)}>View details</MenuItem>
            <MenuItem icon={<Printer />} onClick={() => actions.printCopies(item)}>Print copies…</MenuItem>
            <MenuItem icon={<Copy />} onClick={() => actions.duplicate(item)}>Duplicate LR</MenuItem>
            {(status === "Booked" || status === "On Route" || status === "Delivered") && <MenuDivider />}
            {status === "Booked" && (
              <MenuItem icon={<Truck />} onClick={() => actions.setStatus(item, "On Route")}>Mark On Route</MenuItem>
            )}
            {(status === "Booked" || status === "On Route") && (
              <MenuItem icon={<PackageCheck />} onClick={() => actions.setStatus(item, "Delivered")}>Mark Delivered</MenuItem>
            )}
            {status === "Delivered" && (
              <MenuItem icon={<Truck />} onClick={() => actions.setStatus(item, "On Route")}>Undo delivered (On Route)</MenuItem>
            )}
            {(status === "Booked" || status === "On Route") && (
              <MenuItem icon={<XCircle />} danger onClick={() => actions.cancel(item)}>Cancel LR</MenuItem>
            )}
            <MenuDivider />
            <MenuItem icon={<Trash2 />} danger onClick={() => actions.remove(item)}>Delete</MenuItem>
          </Menu>
        </div>

        <div className="mt-2 text-right text-[10px] text-sky-600">
          Created By : {item.createdBy?.name || "Transporter Name"}
        </div>
      </div>
    </div>
  );
}

export function LrCardSkeleton() {
  return (
    <div className="flex animate-pulse overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="w-7 bg-neutral-200" />
      <div className="flex-1 space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-neutral-200" />
        <div className="h-4 w-2/3 rounded bg-neutral-200" />
        <div className="h-3 w-1/2 rounded bg-neutral-200" />
        <div className="h-8 w-full rounded bg-neutral-100" />
      </div>
    </div>
  );
}
