"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, FileText, Pencil, Printer, Search, Trash2 } from "@/components/icons";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteFreightBill,
  listFreightBills,
  type FreightBillRecord,
} from "@/lib/bill/api";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { BillPrintPreviewStandalone } from "@/components/bills/BillPrintPreviewStandalone";
import { WorkflowTabs } from "@/components/admin/WorkflowTabs";

const PAGE_SIZE = 10;

const PARTY_VARIANT: Record<string, "brand" | "info" | "neutral"> = {
  Consignor: "brand",
  Consignee: "info",
  "Third Party": "neutral",
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(value: number | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "₹0";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default function BillsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<FreightBillRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FreightBillRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // The row clicked for "Print" — mirrors bookings/page.tsx's printTarget pattern.
  const [printTarget, setPrintTarget] = useState<FreightBillRecord | null>(null);

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
      const res = await listFreightBills({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't load bills."));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFreightBill(deleteTarget._id);
      toast.success(`Bill ${deleteTarget.billNo} deleted.`);
      const wasLastOnPage = items.length === 1 && page > 1;
      setDeleteTarget(null);
      if (wasLastOnPage) {
        setPage((p) => p - 1);
      } else {
        fetchList();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't delete this bill."));
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

  const hasActiveFilters = Boolean(debouncedSearch);

  return (
    <div className="">
      {printTarget ? (
        <BillPrintPreviewStandalone bill={printTarget} onClose={() => setPrintTarget(null)} />
      ) : (
        <>
          <WorkflowTabs workflow="billing" activePage="list" />

          {/* HEADER */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-h3 font-semibold text-neutral-900">Freight Bills</h1>
              <p className="text-body-sm text-neutral-500">All freight bills raised so far.</p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:max-w-xs sm:flex-1">
              <Input
                placeholder="Search by bill no, CNS no, party…"
                startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* CONTENT */}
          {isLoading ? (
            <Loading fullPage label="Loading bills…" />
          ) : error ? (
            <ErrorState description={error} onRetry={fetchList} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden="true" />}
              title="No bills found"
              description={
                hasActiveFilters
                  ? "Try adjusting your search."
                  : "Create your first freight bill to see it here."
              }
            />
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <Card padding="none" className="hidden overflow-hidden md:block">
                <table className="w-full text-left text-body-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-caption font-semibold uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-3">Bill No.</th>
                      <th className="px-4 py-3">Bill STN</th>
                      <th className="px-4 py-3">Billed To</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((bill) => (
                      <tr
                        key={bill._id}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-brand-700">{bill.billNo}</div>
                          <div className="text-caption text-neutral-500">{formatDate(bill.billDate)}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-800">{bill.billStn || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-800">{bill.billedTo?.name || "—"}</div>
                          <Badge variant={PARTY_VARIANT[bill.billedToType] ?? "neutral"} className="mt-1">
                            {bill.billedToType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{bill.items?.length ?? 0}</td>
                        <td className="px-4 py-3 text-neutral-700">{bill.vehicleNumber || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                          {formatINR(bill.totalAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Print bill"
                              onClick={() => setPrintTarget(bill)}
                            >
                              <Printer className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Link href={`/admin/billing/new?id=${bill._id}`}>
                              <Button variant="ghost" size="icon" aria-label="Edit bill">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete bill"
                              onClick={() => setDeleteTarget(bill)}
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
                {items.map((bill) => (
                  <Card key={bill._id} padding="md" className="rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[15px] font-bold text-brand-700">{bill.billNo}</div>
                        <div className="text-caption text-neutral-500">{formatDate(bill.billDate)}</div>
                      </div>
                      <Badge variant={PARTY_VARIANT[bill.billedToType] ?? "neutral"}>{bill.billedToType}</Badge>
                    </div>

                    <div className="mt-3 text-body-sm font-medium text-neutral-800">
                      {bill.billedTo?.name || "—"}
                    </div>

                    <div className="mt-2 space-y-0.5 text-body-sm text-neutral-600">
                      <div>Bill STN: {bill.billStn || "—"}</div>
                      <div>
                        {bill.items?.length ?? 0} item{(bill.items?.length ?? 0) === 1 ? "" : "s"}
                        {bill.vehicleNumber ? ` • ${bill.vehicleNumber}` : ""}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                      <div className="text-[15px] font-semibold text-neutral-900">{formatINR(bill.totalAmount)}</div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Print bill"
                          onClick={() => setPrintTarget(bill)}
                        >
                          <Printer className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Link href={`/admin/billing/new?id=${bill._id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete bill"
                          onClick={() => setDeleteTarget(bill)}
                        >
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
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this bill?"
        description={
          deleteTarget
            ? `This will permanently delete bill ${deleteTarget.billNo}. This can't be undone.`
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