import { computeBillingTotals } from "@/lib/calculations/billing";
import { DEFAULT_LR_STATUS, isLrStatus, type LrStatus } from "@/lib/consignment-status";
import type { ConsignmentListItem, MongoDate } from "@/lib/api/consignments";

export const getStatus = (r: Pick<ConsignmentListItem, "status">): LrStatus =>
  isLrStatus(r.status) ? r.status : DEFAULT_LR_STATUS;

export function toDateValue(value: MongoDate): Date | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value : value.$date;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd-mm-yyyy, or an em dash when empty / invalid. */
export function formatDate(value: MongoDate): string {
  const d = toDateValue(value);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function formatINR(value: number | string | undefined | null): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "₹0";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}

/** Grand total (charges + GST), using the same calculation as the billing form. */
export function lrTotal(r: ConsignmentListItem): number {
  try {
    const tax = r.tax && r.tax.type ? r.tax : { type: "NONE" };
    return computeBillingTotals((r.charges ?? {}) as never, tax as never).grandTotal;
  } catch {
    return 0;
  }
}

export function receivedAmount(r: ConsignmentListItem): number {
  const n = parseFloat(String(r.payment?.receivedMoney ?? ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Amount still to be collected. Zero once the payment is marked Paid or the LR is cancelled. */
export function balanceDue(r: ConsignmentListItem): number {
  if (getStatus(r) === "Cancelled" || r.payment?.status === "Paid") return 0;
  return Math.max(0, Math.round((lrTotal(r) - receivedAmount(r)) * 100) / 100);
}

/** Suggest a payment status from the amount entered against the LR total. */
export function suggestPaymentStatus(total: number, received: number): "Pending" | "Partially Paid" | "Paid" {
  if (received <= 0) return "Pending";
  return received + 0.005 >= total ? "Paid" : "Partially Paid";
}

export function summaryText(r: ConsignmentListItem, link?: string): string {
  return [
    `LR No: ${r.consignmentNumber}`,
    `Date: ${formatDate(r.bookingDate)}`,
    `Route: ${r.from?.location || "—"} → ${r.to?.location || "—"}`,
    `Vehicle: ${r.vehicleNumber || "—"}`,
    `Consignor: ${r.consignor?.name || "—"}`,
    `Consignee: ${r.consignee?.name || "—"}`,
    `Status: ${getStatus(r)}`,
    link ? `\nView LR: ${link}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------- CSV export ------------------------------- */

const CSV_HEAD = [
  "LR No", "Booking Date", "From", "To", "Consignor", "Consignee", "Vehicle", "E-way Bill",
  "Packages", "Charge Weight", "Status", "Delivered On", "Payment Status", "Payment Type",
  "Total", "Received", "Balance", "POD", "Cancel Reason",
];

/** Neutralise spreadsheet formula injection (cells starting with = + - @). */
function cell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: ConsignmentListItem[]): string {
  const body = rows.map((r) => [
    r.consignmentNumber, formatDate(r.bookingDate), r.from?.location, r.to?.location,
    r.consignor?.name, r.consignee?.name, r.vehicleNumber, r.eWayBillNumber,
    r.shipment?.packages, r.shipment?.chargeWeight, getStatus(r),
    r.deliveredAt ? formatDate(r.deliveredAt) : "", r.payment?.status || "Pending", r.payment?.type,
    lrTotal(r), receivedAmount(r), balanceDue(r), r.podUrl ? "Yes" : "No", r.cancelReason,
  ]);
  // BOM so Excel opens Hindi / non-ASCII names correctly.
  return "\uFEFF" + [CSV_HEAD, ...body].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadCsv(rows: ConsignmentListItem[], name: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" }), `${name}-${stamp}.csv`);
}
