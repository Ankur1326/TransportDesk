"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Eye, Pencil, Printer, Search, Trash2, Truck } from "@/components/icons";

import { Card } from "@/components/ui/Card";
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
  deleteConsignment,
  getConsignment,
  getApiErrorMessage,
  listConsignments,
  type ConsignmentRecord,
  type ConsignmentListItem,
  type MongoDate,
} from "@/lib/api/consignments";
import { ConsignmentDetailsModal } from "@/components/billing/ConsignmentDetailsModal";
import { PrintPreview } from "@/components/billing/Printpreview";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
  { value: "Cancelled", label: "Cancelled" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  Paid: "success",
  "Partially Paid": "warning",
  Pending: "neutral",
  Cancelled: "error",
};

/** Mongo dates arrive either as a plain ISO string or as `{ $date: "..." }` — normalize both. */
function toDateValue(value: MongoDate): Date | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value : value.$date;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: MongoDate): string {
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

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ConsignmentListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ConsignmentListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // The row clicked for "View Details".
  const [viewTarget, setViewTarget] = useState<ConsignmentListItem | null>(null);

  // The row clicked for "Print" — was a bare `previewOpen` boolean before, which
  // meant every row's print button opened the same preview with no data behind
  // it (`values` wasn't even defined). Tracking the actual item fixes both.
  const [printTarget, setPrintTarget] = useState<ConsignmentRecord | null>(null);
  const [loadingPrintId, setLoadingPrintId] = useState<string | null>(null);

  const handlePrint = async (item: ConsignmentListItem) => {
    setLoadingPrintId(item._id);
    try {
      setPrintTarget(await getConsignment(item._id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load this consignment for printing."));
    } finally {
      setLoadingPrintId(null);
    }
  };

  // Debounce the search box so we're not firing a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listConsignments({
        search: debouncedSearch || undefined,
        paymentStatus: paymentStatus || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't load consignments."));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, paymentStatus, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteConsignment(deleteTarget._id);
      toast.success(`Consignment ${deleteTarget.consignmentNumber} deleted.`);
      const wasLastOnPage = items.length === 1 && page > 1;
      setDeleteTarget(null);
      if (wasLastOnPage) {
        setPage((p) => p - 1);
      } else {
        fetchList();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't delete this consignment."));
    } finally {
      setIsDeleting(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) return "0 results";
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination]);

  const hasActiveFilters = Boolean(debouncedSearch || paymentStatus);

  return (
    <div className="">
      {printTarget ? (
        <PrintPreview values={printTarget} onClose={() => setPrintTarget(null)} />
      ) :
        <>
          <WorkflowTabs workflow="consignment" activePage="list" />

          {/* HEADER */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-h3 font-semibold text-neutral-900">Bookings</h1>
              <p className="text-body-sm text-neutral-500">All consignments booked so far.</p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:max-w-xs sm:flex-1">
              <Input
                placeholder="Search by CNS no, vehicle, consignor…"
                startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sm:w-56">
              <Select
                options={STATUS_OPTIONS}
                placeholder="All statuses"
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* CONTENT */}
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
              {/* DESKTOP TABLE */}
              <Card padding="none" className="hidden overflow-hidden md:block">
                <table className="w-full text-left text-body-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-caption font-semibold uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-3">CNS No.</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Consignor / Consignee</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Weight</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item._id}
                        className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                        onClick={() => setViewTarget(item)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-brand-700">{item.consignmentNumber}</div>
                          <div className="text-caption text-neutral-500">{formatDate(item.bookingDate)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-800">
                            {item.from?.location || "—"} <span className="text-neutral-400">→</span> {item.to?.location || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-800">{item.consignor?.name || "—"}</div>
                          <div className="text-caption text-neutral-500">to {item.consignee?.name || "—"}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-800">{item.vehicleNumber || "—"}</td>
                        <td className="px-4 py-3 text-neutral-700">{item.shipment?.actualWeight || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[item.payment?.status ?? ""] ?? "neutral"}>
                            {item.payment?.status || "Pending"}
                          </Badge>
                          <div className="mt-1 text-caption text-neutral-500">{item.payment?.type || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                          {formatINR(sumCharges(item.charges))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="View details"
                              onClick={() => setViewTarget(item)}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Print consignment"
                              onClick={() => handlePrint(item)}
                              disabled={loadingPrintId !== null}
                            >
                              <Printer className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Link href={`/admin/consignment/new?id=${item._id}`}>
                              <Button variant="ghost" size="icon" aria-label="Edit consignment">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete consignment"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4 text-error-600" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* MOBILE CARDS */}
              <div className="grid gap-3 md:hidden">
                {items.map((item) => (
                  <Card
                    key={item._id}
                    padding="md"
                    className="cursor-pointer rounded-xl"
                    onClick={() => setViewTarget(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[15px] font-bold text-brand-700">{item.consignmentNumber}</div>
                        <div className="text-caption text-neutral-500">{formatDate(item.bookingDate)}</div>
                      </div>
                      <Badge variant={STATUS_VARIANT[item.payment?.status ?? ""] ?? "neutral"}>
                        {item.payment?.status || "Pending"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-body-sm font-medium text-neutral-800">
                      <span>{item.from?.location || "—"}</span>
                      <span className="text-neutral-400">→</span>
                      <span>{item.to?.location || "—"}</span>
                    </div>

                    <div className="mt-2 space-y-0.5 text-body-sm text-neutral-600">
                      <div>
                        {item.consignor?.name || "—"} <span className="text-neutral-400">→</span> {item.consignee?.name || "—"}
                      </div>
                      <div className="flex items-center gap-1 text-neutral-500">
                        <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.vehicleNumber || "—"}
                        <span className="mx-1">•</span>
                        {item.shipment?.actualWeight || "—"}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                      <div className="text-[15px] font-semibold text-neutral-900">{formatINR(sumCharges(item.charges))}</div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View details"
                          onClick={() => setViewTarget(item)}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Print consignment"
                          onClick={() => handlePrint(item)}
                          disabled={loadingPrintId !== null}
                        >
                          <Printer className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Link href={`/admin/consignment/new?id=${item._id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" aria-label="Delete consignment" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-4 w-4 text-error-600" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-caption text-neutral-500">{rangeLabel}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Prev
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
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      }

      <ConsignmentDetailsModal consignment={viewTarget} onClose={() => setViewTarget(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this consignment?"
        description={
          deleteTarget
            ? `This will permanently delete consignment ${deleteTarget.consignmentNumber}. This can't be undone.`
            : undefined
        }
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}