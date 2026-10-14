"use client";

import { useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Boxes,
  Calendar,
  Copy,
  MapPin,
  Pencil,
  Receipt,
  Shield,
  StickyNote,
  Truck,
  User,
  Wallet,
  X,
} from "@/components/icons";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import type { MongoDate } from "@/lib/api/consignments";

// ─── Local formatters ────────────────────────────────────────────────────────

function toDateValue(value?: MongoDate): Date | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value : value.$date;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value?: MongoDate): string {
  const d = toDateValue(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "₹0";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function sumCharges(charges?: Record<string, number>): number {
  if (!charges) return 0;
  return Object.values(charges).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

function orDash(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const str = String(value).trim();
  return str.length ? str : "—";
}

// ─── Field shapes (widened so nothing from the full document gets dropped) ──

interface PartyDetails {
  customerId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string;
  email?: string;
}

interface LocationDetails {
  location?: string;
  branch?: string;
  state?: string;
  gstin?: string;
}

interface VehicleDetails {
  driverName?: string;
  driverMobile?: string;
  transportMode?: string;
  branch?: string;
  deliveryBranch?: string;
  route?: string;
  expectedDeliveryDate?: MongoDate;
}

interface TaxDetails {
  type?: string;
  percentage?: number | "custom" | "";
  customPercentage?: number;
}

interface InsuranceDetails {
  required?: boolean;
  company?: string;
  policyNumber?: string;
  amount?: number;
  date?: MongoDate;
  riskType?: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  Paid: "success",
  "Partially Paid": "warning",
  Pending: "neutral",
  Cancelled: "error",
};

// ─── Small building blocks ───────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-caption uppercase tracking-wide text-neutral-400">{label}</div>
      <div className={`truncate text-body-sm font-medium text-neutral-800 ${mono ? "font-mono tabular-nums" : ""}`}>
        {orDash(value)}
      </div>
    </div>
  );
}

function SectionShell({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-neutral-100 ${className}`}>
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          {icon}
        </span>
        <h3 className="text-body-sm font-semibold text-neutral-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DetailSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SectionShell title={title} icon={icon} className={className}>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">{children}</div>
    </SectionShell>
  );
}

function taxLabel(tax?: TaxDetails): string {
  if (!tax || !tax.type || tax.type === "NONE") return "No tax";
  const pct = tax.percentage === "custom" ? tax.customPercentage : tax.percentage;
  const pctLabel = pct === undefined || pct === "" ? "—" : `${pct}%`;
  const typeLabel = tax.type === "IGST" ? "IGST" : tax.type === "CGST_SGST" ? "CGST + SGST" : tax.type;
  return `${typeLabel} · ${pctLabel}`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ConsignmentDetailsModal({
  consignment,
  onClose,
}: {
  consignment: any | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!consignment) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [consignment, onClose]);

  if (!consignment) return null;

  const c = consignment;
  const charges = c.charges as Record<string, number> | undefined;
  const chargesTotal = sumCharges(charges);
  const from: LocationDetails = c.from ?? {};
  const to: LocationDetails = c.to ?? {};
  const consignor: PartyDetails = c.consignor ?? {};
  const consignee: PartyDetails = c.consignee ?? {};
  const vehicle: VehicleDetails = c.vehicle ?? {};
  const insurance: InsuranceDetails = c.insurance ?? {};
  const tax: TaxDetails = c.tax ?? {};

  const hasNotes = Boolean(c.remarks || c.internalNotes || c.specialInstructions);

  const handleCopyNumber = () => {
    if (!c.consignmentNumber) return;
    navigator.clipboard?.writeText(c.consignmentNumber);
    toast.success("Consignment number copied");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <Card
        padding="none"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-md shadow-md sm:max-w-4xl sm:rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative shrink-0 border-b border-neutral-100 bg-gradient-to-br from-brand-50/70 to-white px-5 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-white/80 hover:text-neutral-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-h4 font-bold text-neutral-900">{orDash(c.consignmentNumber)}</h2>
                {c.consignmentNumber ? (
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    aria-label="Copy consignment number"
                    className="rounded-md p-1 text-neutral-400 hover:bg-white hover:text-brand-600"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
                <Badge variant={STATUS_VARIANT[c.payment?.status ?? ""] ?? "neutral"}>
                  {c.payment?.status || "Pending"}
                </Badge>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(c.bookingDate)}
                </span>
                <span className="text-neutral-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {orDash(from.location)}
                  <ArrowRight className="h-3 w-3 text-neutral-300" aria-hidden="true" />
                  {orDash(to.location)}
                </span>
                {c.vehicleNumber ? (
                  <>
                    <span className="text-neutral-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                      {c.vehicleNumber}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl bg-white px-4 py-2.5 text-right shadow-sm ring-1 ring-neutral-100">
              <div className="text-caption uppercase tracking-wide text-neutral-400">Total Amount</div>
              <div className="text-h4 font-bold text-neutral-900">{formatINR(chargesTotal)}</div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="space-y-4 overflow-y-auto bg-neutral-50/40 px-5 py-4 sm:px-6">
          {/* Route — shown as a shipping-label style from/to card */}
          <SectionShell title="Route" icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <div className="flex-1 rounded-lg bg-neutral-50 p-3">
                <div className="text-caption uppercase tracking-wide text-neutral-400">From</div>
                <div className="mt-0.5 truncate text-body-sm font-semibold text-neutral-900">
                  {orDash(from.location)}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-caption text-neutral-500 sm:grid-cols-1">
                  <div>Branch: {orDash(from.branch)}</div>
                  <div>State: {orDash(from.state)}</div>
                  <div className="font-mono">GSTIN: {orDash(from.gstin)}</div>
                </div>
              </div>

              <div className="flex items-center justify-center text-neutral-300">
                <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" aria-hidden="true" />
              </div>

              <div className="flex-1 rounded-lg bg-neutral-50 p-3">
                <div className="text-caption uppercase tracking-wide text-neutral-400">To</div>
                <div className="mt-0.5 truncate text-body-sm font-semibold text-neutral-900">
                  {orDash(to.location)}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-caption text-neutral-500 sm:grid-cols-1">
                  <div>Branch: {orDash(to.branch)}</div>
                  <div>State: {orDash(to.state)}</div>
                  <div className="font-mono">GSTIN: {orDash(to.gstin)}</div>
                </div>
              </div>
            </div>
          </SectionShell>

          {/* Booking + Shipment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailSection title="Booking Info" icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}>
              <DetailRow label="CNS Date" value={formatDate(c.cnsDate)} />
              <DetailRow label="Valid Up To" value={formatDate(c.validUpTo)} />
              <DetailRow label="e-Way Bill" value={c.eWayBillNumber} mono />
              <DetailRow label="Invoice No." value={c.invoiceNumber} mono />
              <DetailRow label="Invoice Date" value={formatDate(c.invoiceDate)} />
              <DetailRow label="Segment" value={c.segment} />
              <DetailRow label="Load Type" value={c.loadType} />
            </DetailSection>

            <DetailSection title="Shipment" icon={<Boxes className="h-3.5 w-3.5" aria-hidden="true" />}>
              <DetailRow label="Packages" value={c.shipment?.packages} />
              <DetailRow label="Packing" value={c.shipment?.packing} />
              <DetailRow label="Actual Weight" value={c.shipment?.actualWeight} />
              <DetailRow label="Charge Weight" value={c.shipment?.chargeWeight} />
              <DetailRow label="Volume" value={c.shipment?.volume} />
              <DetailRow label="Declared Value" value={c.shipment?.declaredValue} />
              <DetailRow label="Classification" value={c.shipment?.classification} />
              <DetailRow label="Description" value={c.shipment?.description} />
            </DetailSection>
          </div>

          {/* Consignor + Consignee side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailSection title="Consignor" icon={<User className="h-3.5 w-3.5" aria-hidden="true" />}>
              <DetailRow label="Name" value={consignor.name} />
              <DetailRow label="Mobile" value={consignor.mobile} mono />
              <DetailRow label="Customer ID" value={consignor.customerId} mono />
              <div className="col-span-2 sm:col-span-3">
                <DetailRow label="Address" value={consignor.address} />
              </div>
              <DetailRow label="City" value={consignor.city} />
              <DetailRow label="State" value={consignor.state} />
              <DetailRow label="Pincode" value={consignor.pincode} mono />
              <div className="col-span-2 sm:col-span-3">
                <DetailRow label="GSTIN" value={consignor.gstin} mono />
              </div>
            </DetailSection>

            <DetailSection title="Consignee" icon={<User className="h-3.5 w-3.5" aria-hidden="true" />}>
              <DetailRow label="Name" value={consignee.name} />
              <DetailRow label="Mobile" value={consignee.mobile} mono />
              <DetailRow label="Customer ID" value={consignee.customerId} mono />
              <div className="col-span-2 sm:col-span-3">
                <DetailRow label="Address" value={consignee.address} />
              </div>
              <DetailRow label="City" value={consignee.city} />
              <DetailRow label="State" value={consignee.state} />
              <DetailRow label="Pincode" value={consignee.pincode} mono />
              <div className="col-span-2 sm:col-span-3">
                <DetailRow label="GSTIN" value={consignee.gstin} mono />
              </div>
            </DetailSection>
          </div>

          <DetailSection title="Vehicle & Transport" icon={<Truck className="h-3.5 w-3.5" aria-hidden="true" />}>
            <DetailRow label="Vehicle No." value={c.vehicleNumber} mono />
            <DetailRow label="Transport Mode" value={vehicle.transportMode} />
            <DetailRow label="Driver Name" value={vehicle.driverName} />
            <DetailRow label="Driver Mobile" value={vehicle.driverMobile} mono />
            <DetailRow label="Booking Branch" value={vehicle.branch} />
            <DetailRow label="Delivery Branch" value={vehicle.deliveryBranch} />
            <DetailRow label="Route" value={vehicle.route} />
            <DetailRow label="Expected Delivery" value={formatDate(vehicle.expectedDeliveryDate)} />
          </DetailSection>

          {/* Charges — itemized with a highlighted total */}
          <SectionShell title="Charges" icon={<Receipt className="h-3.5 w-3.5" aria-hidden="true" />}>
            <div className="divide-y divide-neutral-100">
              {[
                ["Freight", charges?.freight],
                ["Local Godown Charges", charges?.localGodownCharges],
                ["Unloading Charge", charges?.unloadingCharge],
                ["Loading Charge", charges?.loadingCharge],
                ["COD Charges", charges?.codCharges],
                ["Statistical Charges", charges?.statisticalCharges],
                ["Local Collection Charges", charges?.localCollectionCharges],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between py-2 text-body-sm">
                  <span className="text-neutral-500">{label}</span>
                  <span className="font-medium text-neutral-800">{formatINR(value as number)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 text-body-sm">
                <span className="text-neutral-500">Tax</span>
                <span className="font-medium text-neutral-800">{taxLabel(tax)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 text-body-sm">
                <span className="font-semibold text-neutral-900">Total</span>
                <span className="text-h4 font-bold text-brand-700">{formatINR(chargesTotal)}</span>
              </div>
            </div>
          </SectionShell>

          {/* Payment + Insurance side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailSection title="Payment" icon={<Wallet className="h-3.5 w-3.5" aria-hidden="true" />}>
              <DetailRow label="Type" value={c.payment?.type} />
              <DetailRow label="Billing Party" value={c.payment?.billingParty} />
              <DetailRow label="Billing Account" value={c.payment?.billingAccount} mono />
              <DetailRow label="Received Money" value={c.payment?.receivedMoney} />
              <DetailRow label="Received Date" value={formatDate(c.payment?.receivedDate)} />
              <DetailRow label="Received Type" value={c.payment?.receivedType} />
              <DetailRow label="UTR Number" value={c.payment?.UTRNumber} mono />
              <DetailRow label="MR Number" value={c.payment?.mrNumber} mono />
              <DetailRow label="MR Date" value={formatDate(c.payment?.mrDate)} />
            </DetailSection>

            <DetailSection title="Insurance" icon={<Shield className="h-3.5 w-3.5" aria-hidden="true" />}>
              <div className="col-span-2 sm:col-span-3">
                <DetailRow label="Required" value={insurance.required ? "Yes" : "No"} />
              </div>
              {insurance.required ? (
                <>
                  <DetailRow label="Company" value={insurance.company} />
                  <DetailRow label="Policy No." value={insurance.policyNumber} mono />
                  <DetailRow label="Amount" value={formatINR(insurance.amount)} />
                  <DetailRow label="Date" value={formatDate(insurance.date)} />
                  <DetailRow label="Risk Type" value={insurance.riskType} />
                </>
              ) : (
                <div className="col-span-2 text-body-sm text-neutral-400 sm:col-span-3">
                  This consignment isn&apos;t insured.
                </div>
              )}
            </DetailSection>
          </div>

          {/* Notes — only shown when there's something to say */}
          {hasNotes ? (
            <SectionShell title="Notes" icon={<StickyNote className="h-3.5 w-3.5" aria-hidden="true" />}>
              <div className="space-y-3">
                {c.remarks ? (
                  <div>
                    <div className="text-caption uppercase tracking-wide text-neutral-400">Remarks</div>
                    <p className="mt-0.5 text-body-sm text-neutral-700">{c.remarks}</p>
                  </div>
                ) : null}
                {c.internalNotes ? (
                  <div>
                    <div className="text-caption uppercase tracking-wide text-neutral-400">Internal Notes</div>
                    <p className="mt-0.5 text-body-sm text-neutral-700">{c.internalNotes}</p>
                  </div>
                ) : null}
                {c.specialInstructions ? (
                  <div>
                    <div className="text-caption uppercase tracking-wide text-neutral-400">Special Instructions</div>
                    <p className="mt-0.5 text-body-sm text-neutral-700">{c.specialInstructions}</p>
                  </div>
                ) : null}
              </div>
            </SectionShell>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-100 bg-white px-5 py-3 sm:px-6">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Link href={`/admin/consignment/new?id=${c._id}`}>
            <Button variant="primary" size="sm">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit Consignment
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}