"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, FileText, Search } from "@/components/icons";

import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteFreightBill,
  listFreightBills,
  type FreightBillRecord,
} from "@/lib/bill/api";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { BillCard, BillCardSkeleton, type BillCardActions } from "@/components/bills/BillCard";
import { BillPrintPreviewStandalone } from "@/components/bills/BillPrintPreviewStandalone";
import { WorkflowTabs } from "@/components/admin/WorkflowTabs";

const PAGE_SIZE = 10;

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

  const actions: BillCardActions = {
    open: setPrintTarget,
    print: setPrintTarget,
    remove: setDeleteTarget,
    copyDetails: async (bill) => {
      const text = [
        `Bill ${bill.billNo}${bill.billStn ? ` (${bill.billStn})` : ""}`,
        `Billed to: ${bill.billedTo?.name ?? "—"}${bill.billedTo?.gstin ? ` · ${bill.billedTo.gstin}` : ""}`,
        `LRs: ${(bill.items ?? []).map((i) => i.cnsNo).join(", ") || "—"}`,
        `Amount: ₹${Number(bill.totalAmount ?? 0).toLocaleString("en-IN")}`,
      ].join("\n");
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Bill details copied.");
      } catch {
        toast.error("Couldn't copy to the clipboard.");
      }
    },
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) return "0 results";
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination]);

  const hasActiveFilters = Boolean(debouncedSearch);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
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
            <div className="grid gap-3">{[0, 1, 2].map((i) => <BillCardSkeleton key={i} />)}</div>
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
              <div className="grid gap-3">
                {items.map((bill) => (
                  <BillCard key={bill._id} bill={bill} actions={actions} />
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