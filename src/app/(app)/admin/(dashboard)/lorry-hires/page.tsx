"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Search, Truck } from "@/components/icons";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CompanySetupNotice } from "@/components/admin/CompanySetupNotice";
import { AddPaymentDialog } from "@/components/lorry-hire/AddPaymentDialog";
import { LorryHireCard, LorryHireCardSkeleton, type LorryHireCardActions } from "@/components/lorry-hire/LorryHireCard";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { getApiErrorInfo, type ApiErrorInfo } from "@/lib/api/errors";
import {
  getLorryHireCounts,
  listLorryHires,
  setLorryHireStatus,
  type LorryHireCounts,
  type LorryHireListResponse,
  type LorryHireRecord,
} from "@/lib/lorry-hire/api";
import { LORRY_HIRE_STATUSES, PAYMENT_STATUSES, type LorryHirePaymentStatus, type LorryHireStatus } from "@/lib/lorry-hire/constants";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
type StatusTab = "All" | LorryHireStatus;
const TABS: StatusTab[] = ["All", ...LORRY_HIRE_STATUSES];

export default function LorryHiresPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [pay, setPay] = useState<"" | LorryHirePaymentStatus>("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<LorryHireListResponse | null>(null);
  const [counts, setCounts] = useState<LorryHireCounts | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [reload, setReload] = useState(0);

  const [payTarget, setPayTarget] = useState<LorryHireRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LorryHireRecord | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const key = `${debounced}|${tab}|${pay}|${page}|${reload}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listLorryHires({
        search: debounced || undefined,
        status: tab === "All" ? undefined : tab,
        paymentStatus: pay || undefined,
        page,
        limit: PAGE_SIZE,
      }),
      getLorryHireCounts(),
    ])
      .then(([list, c]) => {
        if (cancelled) return;
        setData(list);
        setCounts(c);
        setError(null);
      })
      .catch((e) => !cancelled && setError(getApiErrorInfo(e, "Couldn't load your contracts.")))
      .finally(() => !cancelled && setLoadedKey(key));
    return () => {
      cancelled = true;
    };
  }, [key, debounced, tab, pay, page]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const move = async (r: LorryHireRecord, status: LorryHireStatus, note = "") => {
    try {
      await setLorryHireStatus(r._id, status, note);
      toast.success(`${r.lhcNo} marked ${status.toLowerCase()}.`);
      refresh();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Couldn't change the status."));
    }
  };

  const actions: LorryHireCardActions = {
    addPayment: setPayTarget,
    markInTransit: (r) => move(r, "In Transit"),
    markDelivered: (r) => move(r, "Delivered"),
    cancel: setCancelTarget,
  };

  const items = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };
  const filtered = Boolean(debounced || tab !== "All" || pay);
  const countOf = (t: StatusTab) => (t === "All" ? counts?.all : counts?.byStatus[t]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h3 font-semibold text-neutral-900">Lorry Hire Contracts</h1>
          <p className="text-body-sm text-neutral-500">Trucks you&apos;ve hired from brokers and owners.</p>
        </div>
      </div>

      <CompanySetupNotice />

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setPage(1); }}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-body-sm font-medium",
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-600 hover:text-neutral-900"
            )}
          >
            {t}
            {countOf(t) !== undefined && <span className="ml-1.5 text-caption text-neutral-400">{countOf(t)}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="Search LHC no., supplier, truck, driver, city or LR…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <div className="flex gap-1">
          {(["", ...PAYMENT_STATUSES] as const).map((p) => (
            <button
              key={p || "all"}
              onClick={() => { setPay(p); setPage(1); }}
              className={cn(
                "rounded-full px-3 py-1.5 text-body-sm",
                pay === p ? "bg-brand-100 font-medium text-brand-800" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {p ? `${p}${counts ? ` ${counts.byPayment[p]}` : ""}` : "Any payment"}
            </button>
          ))}
        </div>
      </div>

      {error && <ApiErrorState error={error} onRetry={refresh} />}

      {!error && loading && items.length === 0 && (
        <div className="space-y-3">{[0, 1, 2].map((i) => <LorryHireCardSkeleton key={i} />)}</div>
      )}

      {!error && !loading && items.length === 0 && (
        <EmptyState
          icon={<Truck className="h-8 w-8" aria-hidden="true" />}
          title={filtered ? "No contracts match" : "No lorry hire contracts yet"}
          description={filtered ? "Try a different search or filter." : "Create your first contract when you hire a truck."}
        />
      )}

      <div className={cn("space-y-3", loading && items.length > 0 && "opacity-60")}>
        {items.map((r) => <LorryHireCard key={r._id} r={r} actions={actions} />)}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-body-sm text-neutral-600">
          <span>
            {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <AddPaymentDialog contract={payTarget} onClose={() => setPayTarget(null)} onDone={refresh} />
      <ConfirmDialog
        open={!!cancelTarget}
        title={`Cancel ${cancelTarget?.lhcNo ?? "this contract"}?`}
        description="The contract is kept for your records but can't be edited again, and its LRs are freed up."
        confirmLabel="Cancel contract"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => {
          const target = cancelTarget;
          setCancelTarget(null);
          if (target) void move(target, "Cancelled");
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
