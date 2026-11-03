"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Search, Truck } from "@/components/icons";

import { Button } from "@/components/Button";
import Pagination from "@/components/Pagination";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PodBadge } from "@/components/bookings/PodBadge";
import { CompanySetupNotice } from "@/components/admin/CompanySetupNotice";
import { getApiErrorInfo, type ApiErrorInfo } from "@/lib/api/errors";
import { getReadyToBill, type ReadyToBillGroup, type ReadyToBillResult } from "@/lib/api/readyToBill";
import { createBillHref, MAX_LRS_PER_BILL } from "@/lib/ready-to-bill";
import { formatDate, formatINR, lrTotal } from "@/lib/lr-helpers";

// Pagination's page-size menu offers 10 / 20 / 50 / 100 parties per page.
const DEFAULT_PER_PAGE = 10;

/** Delivered LRs with a POD in hand that aren't on a bill, grouped by who pays. */
export default function ReadyToBillPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; data: ReadyToBillResult | null; error: ApiErrorInfo | null } | null>(null);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // One request per (search, refresh) pair; "fetching" is whatever hasn't been answered yet.
  const requestKey = `${applied}|${reloadKey}`;
  const isFetching = loaded?.key !== requestKey;
  const data = loaded?.data ?? null;
  const error = loaded?.error ?? null;

  useEffect(() => {
    const t = setTimeout(() => { setApplied(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getReadyToBill({ search: applied })
      .then((result) => {
        if (cancelled) return;
        setLoaded({ key: requestKey, data: result, error: null });
        setSelected({}); // ids may no longer be ready (billed elsewhere), so start clean
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep the last good list on screen if a refresh fails.
        setLoaded((prev) => ({ key: requestKey, data: prev?.data ?? null, error: getApiErrorInfo(err, "Couldn't load the LRs that are ready to bill.") }));
      });
    return () => { cancelled = true; };
  }, [applied, requestKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const groups = useMemo(() => data?.groups ?? [], [data]);
  const totalPages = Math.max(1, Math.ceil(groups.length / perPage));
  const safePage = Math.min(page, totalPages);
  const visible = groups.slice((safePage - 1) * perPage, safePage * perPage);

  const toggleOne = (key: string, id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev[key] ?? []);
      if (on) next.add(id); else next.delete(id);
      return { ...prev, [key]: next };
    });

  const toggleGroup = (g: ReadyToBillGroup, on: boolean) =>
    setSelected((prev) => ({ ...prev, [g.key]: on ? new Set(g.items.map((i) => i._id)) : new Set() }));

  const createBill = (g: ReadyToBillGroup) => {
    const ids = g.items.filter((i) => selected[g.key]?.has(i._id)).map((i) => i._id);
    if (ids.length === 0) return;
    router.push(createBillHref({ name: g.partyName, kind: g.kind }, ids));
  };

  const initialLoading = isFetching && !data;

  return (
    <div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h3 font-semibold text-neutral-900">Ready to bill</h1>
          <p className="text-body-sm text-neutral-500">
            Delivered LRs with their POD in hand that aren&apos;t on a bill yet, grouped by billing party.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} isLoading={isFetching && Boolean(data)} aria-label="Refresh list">
          {!(isFetching && data) && <RefreshCw className="h-4 w-4" aria-hidden="true" />} Refresh
        </Button>
      </div>

      <CompanySetupNotice className="mt-3" />

      <div className="mt-3 sm:max-w-sm">
        <Input
          placeholder="Search LR no, vehicle, party…"
          aria-label="Search"
          startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-4">
        {initialLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading LRs ready to bill">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
                <div className="h-5 w-48 rounded bg-neutral-200" />
                <div className="mt-4 h-4 w-full rounded bg-neutral-100" />
                <div className="mt-2 h-4 w-3/4 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <ApiErrorState error={error} onRetry={reload} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-6 w-6" aria-hidden="true" />}
            title="Nothing ready to bill"
            description={applied ? "No LRs match your search." : "LRs show up here once they're delivered and their POD is received."}
          />
        ) : (
          <>
            <p className="mb-2 text-body-sm text-neutral-600">
              {data?.total} LR{data?.total === 1 ? "" : "s"} ready across {groups.length} part{groups.length === 1 ? "y" : "ies"}.
              {data?.truncated && " Showing the oldest 1000 — search to narrow the list."}
            </p>

            <div className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
              {visible.map((g) => {
                const picked = selected[g.key] ?? new Set<string>();
                const allPicked = g.items.length > 0 && picked.size === g.items.length;
                const tooMany = picked.size > MAX_LRS_PER_BILL;
                return (
                  <Card key={g.key || "none"} padding="none" className="overflow-hidden rounded-xl shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                      <label className="flex min-w-0 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allPicked}
                          disabled={g.unassigned}
                          onChange={(e) => toggleGroup(g, e.target.checked)}
                          aria-label={`Select all LRs for ${g.partyName}`}
                          className="h-4 w-4 accent-brand-700"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-body-md font-semibold text-neutral-900">{g.partyName}</span>
                          <span className="block text-caption text-neutral-500">
                            {g.items.length} LR{g.items.length === 1 ? "" : "s"}
                            {g.unassigned ? " · set the billing party on these LRs to bill them" : ` · billed as ${g.kind}`}
                          </span>
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        {picked.size > 0 && <Badge variant="brand">{picked.size} selected</Badge>}
                        <Button size="sm" disabled={picked.size === 0 || g.unassigned || tooMany} onClick={() => createBill(g)}
                          title={tooMany ? `Select at most ${MAX_LRS_PER_BILL} LRs per bill` : undefined}>
                          Create bill
                        </Button>
                      </div>
                    </div>
                    {tooMany && (
                      <p role="alert" className="px-4 pt-2 text-body-sm text-error-600">
                        Select at most {MAX_LRS_PER_BILL} LRs per bill.
                      </p>
                    )}

                    <ul className="divide-y divide-neutral-100">
                      {g.items.map((lr) => (
                        <li key={lr._id} className="flex items-start gap-3 px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={picked.has(lr._id)}
                            disabled={g.unassigned}
                            onChange={(e) => toggleOne(g.key, lr._id, e.target.checked)}
                            aria-label={`Select LR ${lr.consignmentNumber}`}
                            className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
                          />
                          <div className="grid min-w-0 flex-1 gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                            <div>
                              <p className="font-semibold text-neutral-900">LR {lr.consignmentNumber}</p>
                              <p className="text-caption text-neutral-500">Delivered {formatDate(lr.deliveredAt)}</p>
                            </div>
                            <p className="truncate text-body-sm text-neutral-600">
                              {lr.from?.location || "—"} → {lr.to?.location || "—"}
                              {lr.vehicleNumber ? ` · ${lr.vehicleNumber}` : ""}
                            </p>
                            <div className="flex items-center gap-2 sm:justify-end">
                              <PodBadge item={lr} />
                              <span className="text-body-sm font-medium tabular-nums text-neutral-900">{formatINR(lrTotal(lr))}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>

            <div className="mt-4">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                itemsPerPage={perPage}
                totalItems={groups.length}
                handlePreviousPage={() => setPage(Math.max(1, safePage - 1))}
                handleNextPage={() => setPage(Math.min(totalPages, safePage + 1))}
                handleFirstPage={() => setPage(1)}
                handleLastPage={() => setPage(totalPages)}
                handleItemPerPageChange={(e: { target: { value: string } }) => { setPerPage(Number(e.target.value)); setPage(1); }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
