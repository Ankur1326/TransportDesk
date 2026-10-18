"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, RefreshCw } from "lucide-react";
import { ChevronLeft, ChevronRight, Truck } from "@/components/icons";

import { Button } from "@/components/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { WorkflowTabs } from "@/components/admin/WorkflowTabs";
import { ConsignmentDetailsModal } from "@/components/billing/ConsignmentDetailsModal";
import { PrintPreview } from "@/components/billing/Printpreview";
import { AccountModal } from "@/components/bookings/AccountModal";
import { BulkBar } from "@/components/bookings/BulkBar";
import { CancelDialog } from "@/components/bookings/CancelDialog";
import { EMPTY_FILTERS, FilterBar, type Filters } from "@/components/bookings/FilterBar";
import { LrCard, LrCardSkeleton, type LrCardActions } from "@/components/bookings/LrCard";
import { Menu, MenuItem } from "@/components/bookings/Menu";
import { STATUS_TABS, StatusTabs, type StatusTab } from "@/components/bookings/StatusTabs";
import {
  deleteConsignment, getApiErrorMessage, getConsignment, getConsignmentCounts, listConsignments,
  type ConsignmentCounts, type ConsignmentListItem, type ConsignmentListParams, type ConsignmentRecord,
} from "@/lib/api/consignments";
import {
  changeLrStatus, patchConsignment, removePod, uploadPod, type ConsignmentPatch,
} from "@/lib/api/consignmentActions";
import { canTransition, type LrStatus } from "@/lib/consignment-status";
import { downloadCsv, getStatus, summaryText } from "@/lib/lr-helpers";
import { preparePodFile } from "@/lib/image-compress";
import { lrPdfPath, LR_STANDARD_COPIES } from "@/lib/lr-copies";

const PAGE_SIZES = [10, 25, 50];
const EXPORT_PAGE = 100;
const EXPORT_MAX_PAGES = 50;

// Row click, Share and Copy link all point at the real PDF endpoint.
const printUrl = (id: string) => lrPdfPath(id);

/** Drop empty filter values so they aren't sent as `?search=`. */
function toParams(f: Filters): ConsignmentListParams {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) if (v !== "" && k !== "sort") out[k] = v;
  return out as ConsignmentListParams;
}

export default function BookingsPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);

  const [items, setItems] = useState<ConsignmentListItem[]>([]);
  const [counts, setCounts] = useState<ConsignmentCounts | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 });
  const [isFetching, setIsFetching] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ConsignmentListItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ConsignmentListItem | null>(null);
  const [accountTarget, setAccountTarget] = useState<ConsignmentListItem | null>(null);
  const [viewTarget, setViewTarget] = useState<ConsignmentListItem | null>(null);
  const [podRemoveTarget, setPodRemoveTarget] = useState<ConsignmentListItem | null>(null);
  const [printTarget, setPrintTarget] = useState<ConsignmentRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const podInput = useRef<HTMLInputElement>(null);
  const podFor = useRef<ConsignmentListItem | null>(null);
  const requestId = useRef(0);

  const dateError = filters.from && filters.to && filters.from > filters.to
    ? "“From” date is after “To” date." : "";

  // Debounce typing; apply selects/dates the same way. Invalid date ranges aren't applied.
  useEffect(() => {
    if (dateError) return;
    const t = setTimeout(() => {
      setApplied(filters);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [filters, dateError]);

  const listParams = useMemo<ConsignmentListParams>(
    () => ({ ...toParams(applied), sort: applied.sort }),
    [applied]
  );

  const fetchList = useCallback(async () => {
    const id = ++requestId.current;
    setIsFetching(true);
    setError(null);
    try {
      const countParams = toParams(applied);
      const [res, tabCounts] = await Promise.all([
        listConsignments({
          ...listParams,
          status: statusTab === "All" ? undefined : statusTab,
          page,
          limit,
        }),
        getConsignmentCounts(countParams).catch(() => null),
      ]);
      if (id !== requestId.current) return; // a newer request superseded this one
      setItems(res.data);
      setPagination(res.pagination);
      if (tabCounts) setCounts(tabCounts);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(getApiErrorMessage(err, "Couldn't load consignments."));
    } finally {
      if (id === requestId.current) {
        setIsFetching(false);
        setHasLoaded(true);
      }
    }
  }, [applied, listParams, statusTab, page, limit]);

  useEffect(() => { void fetchList(); }, [fetchList]);

  // Selection belongs to the current view only.
  useEffect(() => { setSelected(new Set()); }, [applied, statusTab, page, limit]);

  const patchFilters = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const clearFilters = () => { setFilters({ ...EMPTY_FILTERS, sort: filters.sort }); };
  const changeTab = (tab: StatusTab) => { setStatusTab(tab); setPage(1); };

  /* ------------------------------ share / open ------------------------------ */

  const absoluteLink = (r: ConsignmentListItem) => `${window.location.origin}${printUrl(r._id)}`;

  const copyText = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(ok);
    } catch {
      toast.error("Couldn't copy. Your browser blocked clipboard access.");
    }
  };

  /* ------------------------------ status / money ----------------------------- */

  const setStatus = async (r: ConsignmentListItem, s: LrStatus, reason?: string) => {
    try {
      await changeLrStatus(r._id, s, reason);
      toast.success(`LR ${r.consignmentNumber} marked ${s}.`);
      await fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update status."));
    }
  };

  const savePayment = async (patch: ConsignmentPatch) => {
    if (!accountTarget) return;
    try {
      await patchConsignment(accountTarget._id, patch);
      toast.success("Payment details saved.");
      setAccountTarget(null);
      await fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save payment details."));
    }
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    await setStatus(cancelTarget, "Cancelled", reason);
    setCancelTarget(null);
  };

  /* ---------------------------------- POD ----------------------------------- */

  const onPodChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const item = podFor.current;
    e.target.value = "";
    if (!file || !item) return;

    const t = toast.loading("Uploading POD…");
    try {
      const ready = await preparePodFile(file);
      await uploadPod(item._id, ready);
      const moved = getStatus(item) === "Booked" || getStatus(item) === "On Route";
      toast.success(moved ? "POD uploaded. LR marked Delivered." : "POD uploaded.", { id: t });
      await fetchList();
    } catch (err) {
      const msg = err instanceof Error && !("response" in err)
        ? err.message
        : getApiErrorMessage(err, "Couldn't upload POD.");
      toast.error(msg, { id: t });
    }
  };

  const confirmPodRemove = async () => {
    if (!podRemoveTarget) return;
    setBusy(true);
    try {
      await removePod(podRemoveTarget._id);
      toast.success("POD removed.");
      setPodRemoveTarget(null);
      await fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't remove POD."));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ delete / print ----------------------------- */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteConsignment(deleteTarget._id);
      toast.success(`LR ${deleteTarget.consignmentNumber} deleted.`);
      const wasLast = items.length === 1 && page > 1;
      setDeleteTarget(null);
      if (wasLast) setPage((p) => p - 1);
      else await fetchList();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't delete this consignment."));
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const printCopies = async (r: ConsignmentListItem) => {
    try {
      setPrintTarget(await getConsignment(r._id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load this consignment for printing."));
    }
  };

  /* ---------------------------------- bulk ---------------------------------- */

  const selectedRows = items.filter((r) => selected.has(r._id));
  const allOnPage = items.length > 0 && items.every((r) => selected.has(r._id));

  const toggleOne = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  const toggleAll = (on: boolean) => setSelected(on ? new Set(items.map((r) => r._id)) : new Set());

  const bulkStatus = async (target: LrStatus) => {
    const eligible = selectedRows.filter((r) => {
      const s = getStatus(r);
      return s !== target && canTransition(s, target);
    });
    const skipped = selectedRows.length - eligible.length;
    if (eligible.length === 0) {
      toast.error(`None of the selected LRs can be marked ${target}.`);
      return;
    }
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(eligible.map((r) => changeLrStatus(r._id, target)));
      const failed = results.filter((x) => x.status === "rejected").length;
      const ok = results.length - failed;
      const parts = [`${ok} marked ${target}`];
      if (skipped) parts.push(`${skipped} skipped`);
      if (failed) parts.push(`${failed} failed`);
      (failed ? toast.error : toast.success)(parts.join(", ") + ".");
      setSelected(new Set());
      await fetchList();
    } finally {
      setBulkBusy(false);
    }
  };

  /* --------------------------------- export --------------------------------- */

  const exportAll = async () => {
    const t = toast.loading("Preparing export…");
    try {
      const all: ConsignmentListItem[] = [];
      let truncated = false;
      for (let p = 1; p <= EXPORT_MAX_PAGES; p++) {
        const res = await listConsignments({
          ...listParams,
          status: statusTab === "All" ? undefined : statusTab,
          page: p,
          limit: EXPORT_PAGE,
        });
        all.push(...res.data);
        if (p >= res.pagination.totalPages) break;
        if (p === EXPORT_MAX_PAGES) truncated = true;
      }
      if (all.length === 0) {
        toast.error("Nothing to export.", { id: t });
        return;
      }
      downloadCsv(all, "bilties");
      toast.success(
        truncated ? `Exported the first ${all.length} LRs. Narrow the filters to export the rest.` : `Exported ${all.length} LRs.`,
        { id: t }
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Export failed."), { id: t });
    }
  };

  /* --------------------------------- actions -------------------------------- */

  const actions: LrCardActions = {
    open: (r) => window.open(printUrl(r._id), "_blank", "noopener"),
    account: setAccountTarget,
    podUpload: (r) => { podFor.current = r; podInput.current?.click(); },
    podView: (r) => r.podUrl && window.open(r.podUrl, "_blank", "noopener"),
    podRemove: setPodRemoveTarget,
    shareWhatsApp: (r) =>
      window.open(`https://wa.me/?text=${encodeURIComponent(summaryText(r, absoluteLink(r)))}`, "_blank", "noopener"),
    copyLink: (r) => copyText(absoluteLink(r), "Link copied."),
    copyDetails: (r) => copyText(summaryText(r), "Details copied."),
    viewDetails: setViewTarget,
    printCopies,
    pdfAllCopies: (r) => window.open(lrPdfPath(r._id, LR_STANDARD_COPIES), "_blank", "noopener"),
    duplicate: (r) => router.push(`/admin/consignment/new?copyFrom=${r._id}`),
    setStatus: (r, s) => void setStatus(r, s),
    cancel: setCancelTarget,
    remove: setDeleteTarget,
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) return "0 results";
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination]);

  const hasActiveFilters = JSON.stringify({ ...applied, sort: "" }) !== JSON.stringify({ ...EMPTY_FILTERS, sort: "" }) || statusTab !== "All";
  const initialLoading = !hasLoaded && isFetching;

  return (
    <div>
      {printTarget ? (
        <PrintPreview values={printTarget as never} onClose={() => setPrintTarget(null)} />
      ) : (
        <>
          <WorkflowTabs workflow="consignment" activePage="list" />

          {/* HEADER */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-h3 font-semibold text-neutral-900">Bookings</h1>
              <p className="text-body-sm text-neutral-500">All consignments booked so far.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void fetchList()} isLoading={isFetching && hasLoaded}
                aria-label="Refresh list">
                {!(isFetching && hasLoaded) && <RefreshCw className="h-4 w-4" aria-hidden="true" />} Refresh
              </Button>
              <Menu trigger={<><Download /> Export CSV</>}>
                <MenuItem icon={<Download />} onClick={() => downloadCsv(items, "bilties-page")} disabled={items.length === 0}>
                  This page ({items.length})
                </MenuItem>
                <MenuItem icon={<Download />} onClick={() => downloadCsv(selectedRows, "bilties-selected")}
                  disabled={selectedRows.length === 0}>
                  Selected ({selectedRows.length})
                </MenuItem>
                <MenuItem icon={<Download />} onClick={() => void exportAll()} disabled={pagination.total === 0}>
                  All matching filters ({pagination.total})
                </MenuItem>
              </Menu>
            </div>
          </div>

          <div className="mt-3"><StatusTabs value={statusTab} counts={counts} onChange={changeTab} /></div>

          <div className="mt-3">
            <FilterBar filters={filters} onChange={patchFilters} onClear={clearFilters} dateError={dateError} />
          </div>

          {/* CONTENT */}
          <div className="mt-4">
            {initialLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading consignments">
                {[0, 1, 2, 3].map((i) => <LrCardSkeleton key={i} />)}
              </div>
            ) : error && items.length === 0 ? (
              <ErrorState description={error} onRetry={() => void fetchList()} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-6 w-6" aria-hidden="true" />}
                title="No consignments found"
                description={hasActiveFilters ? "Try adjusting your search or filters." : "Create your first consignment to see it here."}
              />
            ) : (
              <>
                {error && (
                  <p role="alert" className="mb-2 text-body-sm text-error-600">
                    {error} Showing the last loaded results.
                  </p>
                )}

                <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-body-sm text-neutral-600">
                  <input type="checkbox" checked={allOnPage} onChange={(e) => toggleAll(e.target.checked)}
                    className="h-4 w-4 accent-brand-700" />
                  Select all on this page
                </label>

                <div className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
                  {items.map((item) => (
                    <LrCard
                      key={item._id}
                      item={item}
                      selected={selected.has(item._id)}
                      onSelect={(on) => toggleOne(item._id, on)}
                      actions={actions}
                    />
                  ))}
                </div>

                {/* PAGINATION */}
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <div className="flex items-center gap-3">
                    <p className="text-caption text-neutral-500">{rangeLabel}</p>
                    <div className="w-24">
                      <Select
                        aria-label="Rows per page"
                        options={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} / page` }))}
                        value={String(limit)}
                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                    </Button>
                    <span className="px-1 text-body-sm text-neutral-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages || isFetching}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>
                      Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <BulkBar
            count={selected.size}
            busy={bulkBusy}
            onOnRoute={() => void bulkStatus("On Route")}
            onDelivered={() => void bulkStatus("Delivered")}
            onExport={() => downloadCsv(selectedRows, "bilties-selected")}
            onClear={() => setSelected(new Set())}
          />
        </>
      )}

      {/* hidden file picker for POD uploads */}
      <input ref={podInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPodChosen} />

      <ConsignmentDetailsModal consignment={viewTarget as never} onClose={() => setViewTarget(null)} />
      <AccountModal row={accountTarget} onClose={() => setAccountTarget(null)} onSave={savePayment} />
      <CancelDialog row={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={confirmCancel} />

      <ConfirmDialog
        open={Boolean(podRemoveTarget)}
        title="Remove this POD?"
        description={podRemoveTarget ? `The proof of delivery for LR ${podRemoveTarget.consignmentNumber} will be deleted. The LR status won't change.` : undefined}
        confirmLabel={busy ? "Removing…" : "Remove"}
        destructive
        onConfirm={confirmPodRemove}
        onCancel={() => setPodRemoveTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this consignment?"
        description={deleteTarget ? `This will permanently delete LR ${deleteTarget.consignmentNumber}. This can't be undone.` : undefined}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
