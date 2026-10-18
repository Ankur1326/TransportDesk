"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Calculator, Copy, Download, FileCheck2, Link2, MapPin, MessageCircle,
  MoreHorizontal, PackageCheck, Share2, XCircle,
} from "lucide-react";
import { ChevronLeft, ChevronRight, Eye, Pencil, Printer, Search, Trash2, Truck } from "@/components/icons";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { WorkflowTabs } from "@/components/admin/WorkflowTabs";
import {
  deleteConsignment, getConsignment, getApiErrorMessage, listConsignments,
  type ConsignmentRecord, type ConsignmentListItem, type MongoDate,
} from "@/lib/api/consignments";
import { patchConsignment, uploadPod, type LrStatus } from "@/lib/api/consignmentActions";
import { ConsignmentDetailsModal } from "@/components/billing/ConsignmentDetailsModal";
import { PrintPreview } from "@/components/billing/Printpreview";

const PAGE_SIZE = 10;

/** List item + the fields this page needs. Move these into ConsignmentListItem when convenient. */
type Row = ConsignmentListItem & {
  status?: LrStatus;
  podUrl?: string;
  createdBy?: { name?: string };
};

const STATUS_TABS: ("All" | LrStatus)[] = ["All", "Booked", "On Route", "Delivered", "Cancelled"];

const STATUS_STRIP: Record<LrStatus, string> = {
  Booked: "bg-amber-500",
  "On Route": "bg-blue-500",
  Delivered: "bg-green-600",
  Cancelled: "bg-red-500",
};

const PAYMENT_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
];

const PAYMENT_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  Paid: "success",
  "Partially Paid": "warning",
  Pending: "error",
  Cancelled: "neutral",
};

const getStatus = (r: Row): LrStatus => r.status ?? "Booked";
const printUrl = (id: string) => `/admin/print/${id}`;

/* ------------------------------ helpers ------------------------------ */

function toDateValue(value: MongoDate): Date | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value : value.$date;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: MongoDate): string {
  const d = toDateValue(value);
  return d ? d.toLocaleDateString("en-GB").replace(/\//g, "-") : "—";
}

function formatINR(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "₹0";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function sumCharges(charges?: Record<string, number>): number {
  return charges ? Object.values(charges).reduce((s, v) => s + (Number(v) || 0), 0) : 0;
}

function summaryText(r: Row, link?: string): string {
  return [
    `LR No: ${r.consignmentNumber}`,
    `Date: ${formatDate(r.bookingDate)}`,
    `Route: ${r.from?.location || "—"} → ${r.to?.location || "—"}`,
    `Vehicle: ${r.vehicleNumber || "—"}`,
    `Consignor: ${r.consignor?.name || "—"}`,
    `Consignee: ${r.consignee?.name || "—"}`,
    `Status: ${getStatus(r)}`,
    link ? `\nView LR: ${link}` : "",
  ].filter(Boolean).join("\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* --------------------------- small components --------------------------- */

function Menu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium text-sky-600 hover:bg-sky-50"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-full z-30 mt-1 min-w-52 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger, disabled }: {
  icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-body-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300 ${
        danger ? "text-error-600" : "text-neutral-700"
      }`}
    >
      <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </button>
  );
}

function ActionBtn({ icon, label, onClick, href, disabled }: {
  icon: ReactNode; label: string; onClick?: () => void; href?: string; disabled?: boolean;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium transition [&>svg]:h-4 [&>svg]:w-4 ${
    disabled ? "cursor-not-allowed bg-neutral-200 text-neutral-400" : "text-sky-600 hover:bg-sky-50"
  }`;
  if (href && !disabled) {
    return <Link href={href} className={cls}>{icon}{label}</Link>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {icon}{label}
    </button>
  );
}

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
          <Truck
            className="absolute -top-2.5 h-5 w-5 text-blue-600"
            style={{ left: `calc(${pct}% - ${(pct / 100) * 20}px)` }}
            aria-hidden="true"
          />
        </div>
        <PackageCheck
          className={`h-5 w-5 shrink-0 ${status === "Delivered" ? "text-green-600" : "text-neutral-400"}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function AccountModal({ row, onClose, onSave }: {
  row: Row | null; onClose: () => void; onSave: (status: string) => Promise<void>;
}) {
  const [value, setValue] = useState("Pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) setValue(row.payment?.status || "Pending");
  }, [row]);

  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-h4 font-semibold text-neutral-900">Account · LR {row.consignmentNumber}</h2>
        <p className="mt-1 text-body-sm text-neutral-500">
          Freight {formatINR(sumCharges(row.charges))} · {row.payment?.type || "—"}
        </p>
        <div className="mt-4">
          <Select
            label="Payment status"
            options={PAYMENT_OPTIONS}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try { await onSave(value); } finally { setSaving(false); }
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- page -------------------------------- */

export default function BookingsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [statusTab, setStatusTab] = useState<"All" | LrStatus>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Row[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [accountTarget, setAccountTarget] = useState<Row | null>(null);
  const [viewTarget, setViewTarget] = useState<Row | null>(null);
  const [printTarget, setPrintTarget] = useState<ConsignmentRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const podInput = useRef<HTMLInputElement>(null);
  const podFor = useRef<Row | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listConsignments({
        search: debouncedSearch || undefined,
        paymentStatus: paymentStatus || undefined,
        status: statusTab === "All" ? undefined : statusTab,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit: PAGE_SIZE,
      } as any);
      setItems(res.data as Row[]);
      setPagination(res.pagination);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't load consignments."));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, paymentStatus, statusTab, fromDate, toDate, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /* ---- row click: print-style page in a new tab, no copy name ---- */
  const openPreview = (item: Row) => window.open(printUrl(item._id), "_blank", "noopener");

  /* ---- share ---- */
  const absoluteLink = (item: Row) => `${window.location.origin}${printUrl(item._id)}`;

  const shareWhatsApp = (item: Row) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(summaryText(item, absoluteLink(item)))}`, "_blank");

  const copyDetails = async (item: Row) => {
    await navigator.clipboard.writeText(summaryText(item));
    toast.success("Details copied.");
  };

  const copyLink = async (item: Row) => {
    await navigator.clipboard.writeText(absoluteLink(item));
    toast.success("Link copied.");
  };

  /* ---- print copies (multi-copy preview with copy names) ---- */
  const printCopies = async (item: Row) => {
    try {
      setPrintTarget(await getConsignment(item._id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load this consignment for printing."));
    }
  };

  /* ---- status / payment / POD ---- */
  const changeStatus = async (item: Row, status: LrStatus) => {
    try {
      await patchConsignment(item._id, { status });
      toast.success(`LR ${item.consignmentNumber} marked ${status}.`);
      fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update status."));
    }
  };

  const savePayment = async (status: string) => {
    if (!accountTarget) return;
    try {
      await patchConsignment(accountTarget._id, { "payment.status": status });
      toast.success("Payment updated.");
      setAccountTarget(null);
      fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update payment."));
    }
  };

  const onPod = (item: Row) => {
    if (item.podUrl) {
      window.open(item.podUrl, "_blank");
      return;
    }
    podFor.current = item;
    podInput.current?.click();
  };

  const onPodChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const item = podFor.current;
    e.target.value = "";
    if (!file || !item) return;
    const t = toast.loading("Uploading POD…");
    try {
      await uploadPod(item._id, file);
      await patchConsignment(item._id, { status: "Delivered" });
      toast.success("POD uploaded. LR marked Delivered.");
      fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't upload POD."));
    } finally {
      toast.dismiss(t);
    }
  };

  /* ---- delete / cancel ---- */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteConsignment(deleteTarget._id);
      toast.success(`Consignment ${deleteTarget.consignmentNumber} deleted.`);
      const wasLast = items.length === 1 && page > 1;
      setDeleteTarget(null);
      if (wasLast) setPage((p) => p - 1);
      else fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't delete this consignment."));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await changeStatus(cancelTarget, "Cancelled");
    setCancelTarget(null);
  };

  /* ---- CSV export (current page) ---- */
  const exportCsv = () => {
    const head = ["LR No", "Date", "From", "To", "Consignor", "Consignee", "Vehicle", "Status", "Payment", "Amount"];
    const rows = items.map((r) => [
      r.consignmentNumber, formatDate(r.bookingDate), r.from?.location, r.to?.location,
      r.consignor?.name, r.consignee?.name, r.vehicleNumber, getStatus(r),
      r.payment?.status, sumCharges(r.charges),
    ]);
    const csv = [head, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "consignments.csv");
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) return "0 results";
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination]);

  const hasActiveFilters = Boolean(debouncedSearch || paymentStatus || fromDate || toDate || statusTab !== "All");

  return (
    <div>
      {printTarget ? (
        <PrintPreview values={printTarget as any} onClose={() => setPrintTarget(null)} />
      ) : (
        <>
          <WorkflowTabs workflow="consignment" activePage="list" />

          {/* HEADER */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-h3 font-semibold text-neutral-900">Bookings</h1>
              <p className="text-body-sm text-neutral-500">All consignments booked so far.</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={items.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
            </Button>
          </div>

          {/* STATUS TABS */}
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatusTab(s); setPage(1); }}
                className={`rounded-full border px-3.5 py-1.5 text-body-sm font-medium transition ${
                  statusTab === s
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* FILTERS */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search LR no, vehicle, consignor…"
              startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              options={PAYMENT_OPTIONS}
              placeholder="All payment statuses"
              value={paymentStatus}
              onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            />
            <Input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            />
            <Input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            />
          </div>

          {/* CONTENT */}
          <div className="mt-4">
            {isLoading ? (
              <Loading fullPage label="Loading consignments…" />
            ) : error ? (
              <ErrorState description={error} onRetry={fetchList} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-6 w-6" aria-hidden="true" />}
                title="No consignments found"
                description={
                  hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "Create your first consignment to see it here."
                }
              />
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((item) => {
                    const status = getStatus(item);
                    const cancelled = status === "Cancelled";
                    const pay = item.payment?.status || "Pending";

                    return (
                      <div
                        key={item._id}
                        role="link"
                        tabIndex={0}
                        onClick={() => openPreview(item)}
                        onKeyDown={(e) => { if (e.key === "Enter") openPreview(item); }}
                        className="flex cursor-pointer overflow-visible rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
                      >
                        {/* status strip */}
                        <div
                          className={`flex w-7 shrink-0 items-center justify-center rounded-l-lg text-[11px] font-semibold uppercase tracking-wide text-white ${STATUS_STRIP[status]}`}
                        >
                          <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{status}</span>
                        </div>

                        <div className="min-w-0 flex-1 p-4">
                          {/* row 1 */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-neutral-500">
                            <div>
                              LR Number : <b className="text-neutral-900">{item.consignmentNumber}</b>{" "}
                              <span className="ml-1 font-medium text-neutral-800">[{formatDate(item.bookingDate)}]</span>
                            </div>
                            <div className="flex items-center gap-2">
                              Payment Status :
                              <Badge variant={PAYMENT_VARIANT[cancelled ? "Cancelled" : pay] ?? "neutral"}>{pay}</Badge>
                            </div>
                          </div>

                          {/* route / parties / vehicle / tracker */}
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5 text-body-sm text-neutral-500">
                              <div className="flex items-center gap-3 font-semibold text-neutral-800">
                                <span>{item.from?.location || "--"}</span>
                                <ChevronRight
                                  className="h-5 w-5 rounded-full border border-neutral-400 text-neutral-500"
                                  aria-hidden="true"
                                />
                                <span>{item.to?.location || "--"}</span>
                              </div>
                              <div>Consignor : <span className="text-neutral-800">{item.consignor?.name || ""}</span></div>
                              <div>Consignee : <span className="text-neutral-800">{item.consignee?.name || ""}</span></div>
                            </div>

                            <div className="flex flex-col items-start gap-2 md:items-end">
                              <div className="text-body-sm text-neutral-500">
                                Vehicle No : <span className="font-medium text-neutral-800">{item.vehicleNumber || ""}</span>
                                <span className="mx-2">•</span>
                                <span className="font-semibold text-neutral-900">{formatINR(sumCharges(item.charges))}</span>
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
                            {!cancelled && (
                              <ActionBtn icon={<Calculator />} label="Account" onClick={() => setAccountTarget(item)} />
                            )}
                            <ActionBtn
                              icon={<FileCheck2 />}
                              label={item.podUrl ? "View POD" : "POD"}
                              onClick={() => onPod(item)}
                              disabled={cancelled}
                            />
                            <ActionBtn
                              icon={<Pencil />}
                              label="Edit"
                              href={`/admin/consignment/new?id=${item._id}`}
                              disabled={cancelled}
                            />

                            <Menu trigger={<><Share2 className="h-4 w-4" /> Share</>}>
                              <MenuItem icon={<MessageCircle />} onClick={() => shareWhatsApp(item)}>
                                WhatsApp (details + link)
                              </MenuItem>
                              <MenuItem icon={<Link2 />} onClick={() => copyLink(item)}>Copy print link</MenuItem>
                              <MenuItem icon={<Copy />} onClick={() => copyDetails(item)}>Copy details</MenuItem>
                            </Menu>

                            <Menu trigger={<><MoreHorizontal className="h-4 w-4" /> More</>}>
                              <MenuItem icon={<Eye />} onClick={() => setViewTarget(item)}>View details</MenuItem>
                              <MenuItem icon={<Printer />} onClick={() => printCopies(item)}>Print copies…</MenuItem>
                              <MenuItem
                                icon={<Copy />}
                                onClick={() => router.push(`/admin/consignment/new?copyFrom=${item._id}`)}
                              >
                                Duplicate LR
                              </MenuItem>
                              {status === "Booked" && (
                                <MenuItem icon={<Truck />} onClick={() => changeStatus(item, "On Route")}>
                                  Mark On Route
                                </MenuItem>
                              )}
                              {(status === "Booked" || status === "On Route") && (
                                <MenuItem icon={<PackageCheck />} onClick={() => changeStatus(item, "Delivered")}>
                                  Mark Delivered
                                </MenuItem>
                              )}
                              {!cancelled && status !== "Delivered" && (
                                <MenuItem icon={<XCircle />} danger onClick={() => setCancelTarget(item)}>
                                  Cancel LR
                                </MenuItem>
                              )}
                              <MenuItem icon={<Trash2 />} danger onClick={() => setDeleteTarget(item)}>
                                Delete
                              </MenuItem>
                            </Menu>
                          </div>

                          <div className="mt-2 text-right text-[10px] text-sky-600">
                            Created By : {item.createdBy?.name || "Transporter Name"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION */}
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-caption text-neutral-500">{rangeLabel}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                    </Button>
                    <span className="px-1 text-body-sm text-neutral-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    >
                      Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* hidden file picker for POD uploads */}
      <input ref={podInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPodChosen} />

      <ConsignmentDetailsModal consignment={viewTarget} onClose={() => setViewTarget(null)} />
      <AccountModal row={accountTarget} onClose={() => setAccountTarget(null)} onSave={savePayment} />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this LR?"
        description={cancelTarget ? `LR ${cancelTarget.consignmentNumber} will be marked Cancelled.` : undefined}
        confirmLabel="Cancel LR"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this consignment?"
        description={
          deleteTarget
            ? `This will permanently delete consignment ${deleteTarget.consignmentNumber}. This can't be undone.`
            : undefined
        }
        confirmLabel={busy ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}