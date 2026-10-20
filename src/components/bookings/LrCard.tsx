"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, CalendarDays, Calculator, Copy, Eye as EyeIcon, FileCheck2, FileText, Link2,
  MapPin, MessageCircle, MoreHorizontal, PackageCheck, RefreshCcw, Share2, Truck as TruckIcon, Upload, UserRound, UserRoundCheck, XCircle,
} from "lucide-react";
import { Eye, Pencil, Printer, Trash2, Truck } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import type { LrStatus } from "@/lib/consignment-status";
import { balanceDue, formatDate, formatINR, getStatus, lrTotal, receivedAmount } from "@/lib/lr-helpers";
import { MenuDivider, MenuItem } from "./Menu";

export interface LrCardActions {
  open: (r: ConsignmentListItem) => void;
  account: (r: ConsignmentListItem) => void;
  podUpload: (r: ConsignmentListItem) => void;
  podView: (r: ConsignmentListItem) => void;
  podRemove: (r: ConsignmentListItem) => void;
  /** Open the Share dialog (download Lorry / Consignee / Consignor / File / all copies). */
  share: (r: ConsignmentListItem) => void;
  shareWhatsApp: (r: ConsignmentListItem) => void;
  copyLink: (r: ConsignmentListItem) => void;
  copyDetails: (r: ConsignmentListItem) => void;
  viewDetails: (r: ConsignmentListItem) => void;
  printCopies: (r: ConsignmentListItem) => void;
  /** Open the PDF with every copy in the browser's PDF viewer. */
  pdfAllCopies: (r: ConsignmentListItem) => void;
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

const TRACK_CSS = `
@keyframes lr-drive-in { from { left: 0; } to { left: var(--lr-to); } }
@keyframes lr-road { from { background-position: 0 0; } to { background-position: -24px 0; } }
@keyframes lr-bob { from { transform: translateY(0); } to { transform: translateY(-1.5px); } }
@keyframes lr-beacon { 0%, 100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.15); } }
@keyframes lr-pop { 0% { transform: scale(.5); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes lr-ripple { from { opacity: .55; transform: scale(1); } to { opacity: 0; transform: scale(2.2); } }
@media (prefers-reduced-motion: reduce) { .lr-anim, .lr-anim * { animation: none !important; } }
`;

const TRUCK_W = 22;
const PROGRESS: Record<Exclude<LrStatus, "Cancelled">, number> = { Booked: 0, "On Route": 50, Delivered: 100 };

/**
 * A truck on a road between the booking point and the destination.
 *  - Booked:   parked at the start, beacon blinking.
 *  - On Route: driving on a moving road, bobbing along.
 *  - Delivered: arrives and the package pops with a ripple.
 */
function TruckTracker({ status }: { status: Exclude<LrStatus, "Cancelled"> }) {
  const pct = PROGRESS[status];
  const left = `calc(${pct}% - ${(pct / 100) * TRUCK_W}px)`;
  const driving = status === "On Route";
  const delivered = status === "Delivered";

  return (
    <div className="lr-anim w-full max-w-sm" role="img" aria-label={`Shipment status: ${status}`}>
      <style href="lr-track-css" precedence="default">{TRACK_CSS}</style>

      <div className="flex items-center gap-2">
        {/* origin */}
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {status === "Booked" && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" style={{ animation: "lr-beacon 1.4s ease-in-out infinite" }} />
          )}
        </span>

        {/* road */}
        <div className="relative h-6 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${delivered ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
            {driving && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.85) 0 8px, transparent 8px 24px)",
                  backgroundSize: "24px 100%",
                  animation: "lr-road .55s linear infinite",
                  clipPath: `inset(0 ${100 - pct}% 0 0)`,
                }}
              />
            )}
          </div>

          <span
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left,
              width: TRUCK_W,
              ["--lr-to" as string]: left,
              animation: "lr-drive-in 1.2s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            <TruckIcon
              className={`block h-[22px] w-[22px] ${delivered ? "text-green-600" : driving ? "text-blue-600" : "text-amber-600"}`}
              style={driving ? { animation: "lr-bob .35s ease-in-out infinite alternate" } : undefined}
              aria-hidden="true"
            />
          </span>
        </div>

        {/* destination */}
        <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${delivered ? "bg-green-600 text-white" : "bg-neutral-100 text-neutral-400"}`}
          style={delivered ? { animation: "lr-pop .5s .9s cubic-bezier(.34,1.56,.64,1) both" } : undefined}>
          {delivered && (
            <span className="absolute inset-0 rounded-full bg-green-500" style={{ animation: "lr-ripple 1.4s 1s ease-out 2 both" }} aria-hidden="true" />
          )}
          <PackageCheck className="relative h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-1 flex justify-between text-[11px] font-medium">
        <span className={status === "Booked" ? "text-amber-700" : "text-neutral-500"}>Booked</span>
        <span className={driving ? "text-blue-700" : "text-neutral-400"}>{driving ? "On Route · in transit" : "On Route"}</span>
        <span className={delivered ? "text-green-700" : "text-neutral-400"}>Delivered</span>
      </div>
    </div>
  );
}

const ACTION_CLS =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-body-sm font-medium text-neutral-700 transition hover:bg-white hover:text-brand-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 [&>svg]:h-4 [&>svg]:w-4";
const ACTION_DISABLED = "cursor-not-allowed text-neutral-300";

/** Dropdown with the same look as the action buttons; opens upward when there is no room below. */
function ActionMenu({ trigger, children, className, align = "right" }: {
  trigger: ReactNode; children: ReactNode; className: string; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
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

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setUp(window.innerHeight - r.bottom < 360 && r.top > 360);
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={toggle} className={className}>
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={`absolute z-30 min-w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          } ${up ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, href, disabled, tone }: {
  icon: ReactNode; label: string; onClick?: () => void; href?: string; disabled?: boolean; tone?: "success" | "brand";
}) {
  const toneCls = tone === "success" ? "!text-green-700 hover:!bg-green-50" : tone === "brand" ? "!text-brand-700 hover:!bg-brand-50" : "";
  const cls = `${ACTION_CLS} ${toneCls} ${disabled ? `${ACTION_DISABLED} hover:!bg-transparent hover:!shadow-none hover:!text-neutral-300` : ""}`;
  if (href && !disabled) return <Link href={href} className={cls}>{icon}{label}</Link>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{icon}{label}</button>;
}

function Field({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
        <p className="truncate text-body-sm font-medium text-neutral-900" title={value || undefined}>{value || "—"}</p>
      </div>
    </div>
  );
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
  const paidPct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
  const createdBy = item.createdBy?.name;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open LR ${item.consignmentNumber} as PDF`}
      onClick={() => actions.open(item)}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) actions.open(item); }}
      className={`group relative cursor-pointer rounded-xl border bg-white shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        selected ? "border-brand-500 ring-1 ring-brand-500" : "border-neutral-200"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      {/* vertical status label */}
      <div
        className={`absolute inset-y-0 left-0 flex w-8 items-center justify-center rounded-l-xl text-[11px] font-semibold uppercase tracking-widest text-white ${STRIP[status]}`}
        aria-hidden="true"
      >
        <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{status}</span>
      </div>

      <div className="px-4 pb-3 pl-12 pt-3.5">
        {/* header: identity + status */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span onClick={(e) => e.stopPropagation()} className="flex">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(e.target.checked)}
                aria-label={`Select LR ${item.consignmentNumber}`}
                className="h-4 w-4 cursor-pointer accent-brand-700"
              />
            </span>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h3 className={`truncate text-lg font-semibold tracking-tight ${cancelled ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                LR {item.consignmentNumber}
              </h3>
              <span className="inline-flex items-center gap-1 text-body-sm text-neutral-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(item.bookingDate)}
              </span>
              <span className="hidden items-center gap-1 text-caption font-medium text-brand-700 opacity-0 transition group-hover:opacity-100 sm:inline-flex">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" /> View PDF
              </span>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {!cancelled && <Badge variant={PAY_VARIANT[pay] ?? "neutral"}>{pay}</Badge>}
          </div>
        </div>

        {/* body */}
        <div className="mt-3 grid gap-4 border-t border-neutral-100 pt-3 md:grid-cols-2 lg:grid-cols-[1.1fr_1.2fr_1fr]">
          {/* route + progress */}
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Route</p>
              <div className="mt-0.5 flex items-center gap-2 text-body-md font-semibold text-neutral-900">
                <span className="truncate">{item.from?.location || "--"}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                <span className="truncate">{item.to?.location || "--"}</span>
              </div>
            </div>
            {cancelled ? (
              <div className="rounded-md bg-red-50 px-3 py-1.5 text-body-sm text-red-700">
                <span className="font-semibold">Cancelled</span>
                {item.cancelReason ? ` · ${item.cancelReason}` : ""}
              </div>
            ) : (
              <div>
                <TruckTracker status={status} />
                {status === "Delivered" && item.deliveredAt && (
                  <p className="mt-1 text-caption text-green-700">Delivered on {formatDate(item.deliveredAt)}</p>
                )}
              </div>
            )}
          </div>

          {/* parties */}
          <div className="min-w-0 space-y-2.5">
            <Field icon={<UserRound />} label="Consignor" value={item.consignor?.name} />
            <Field icon={<UserRoundCheck />} label="Consignee" value={item.consignee?.name} />
          </div>

          {/* vehicle + amount */}
          <div className="min-w-0 md:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end lg:gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-body-sm font-medium text-neutral-800">
                <Truck className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                {item.vehicleNumber || "No vehicle"}
              </span>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Total</p>
                <p className="text-xl font-semibold leading-tight text-neutral-900">{formatINR(total)}</p>
              </div>
            </div>
            {!cancelled && total > 0 && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label="Amount received">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[12px]">
                  <span className={received > 0 ? "text-green-700" : "text-neutral-400"}>Received {formatINR(received)}</span>
                  <span className={balance > 0 ? "font-medium text-red-600" : "text-neutral-400"}>Balance {formatINR(balance)}</span>
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
        {!cancelled && <ActionBtn icon={<Calculator />} label="Account" onClick={() => actions.account(item)} />}

        {item.podUrl ? (
          <ActionMenu trigger={<><FileCheck2 /> POD uploaded</>} className={`${ACTION_CLS} !text-green-700 hover:!bg-green-50`} align="left">
            <MenuItem icon={<EyeIcon />} onClick={() => actions.podView(item)}>View POD</MenuItem>
            {!cancelled && <MenuItem icon={<RefreshCcw />} onClick={() => actions.podUpload(item)}>Replace POD</MenuItem>}
            <MenuItem icon={<Trash2 />} danger onClick={() => actions.podRemove(item)}>Remove POD</MenuItem>
          </ActionMenu>
        ) : (
          <ActionBtn icon={<Upload />} label="Upload POD" onClick={() => actions.podUpload(item)} disabled={cancelled} />
        )}

        <ActionBtn icon={<Pencil />} label="Edit" href={`/admin/consignment/new?id=${item._id}`} disabled={cancelled} />
        <ActionBtn icon={<Share2 />} label="Share" tone="brand" onClick={() => actions.share(item)} />

        <span className="ml-auto hidden text-caption text-neutral-400 sm:inline">
          {createdBy ? `Created by ${createdBy}` : ""}
        </span>

        <ActionMenu trigger={<><MoreHorizontal /> More</>} className={ACTION_CLS}>
          <MenuItem icon={<Eye />} onClick={() => actions.viewDetails(item)}>View details</MenuItem>
          <MenuItem icon={<Printer />} onClick={() => actions.pdfAllCopies(item)}>View PDF · all copies</MenuItem>
          <MenuItem icon={<Printer />} onClick={() => actions.printCopies(item)}>Print copies…</MenuItem>
          <MenuItem icon={<MessageCircle />} onClick={() => actions.shareWhatsApp(item)}>WhatsApp (details + PDF link)</MenuItem>
          <MenuItem icon={<Link2 />} onClick={() => actions.copyLink(item)}>Copy PDF link</MenuItem>
          <MenuItem icon={<Copy />} onClick={() => actions.copyDetails(item)}>Copy details</MenuItem>
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
        </ActionMenu>
      </div>
    </article>
  );
}

export function LrCardSkeleton() {
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