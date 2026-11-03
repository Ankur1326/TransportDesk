"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import { DashboardHeader, type DashboardSelection } from "./DashboardHeader";
import { FinancialsSection } from "./FinancialsSection";
import { PartySnapshotCard } from "./PartySnapshotCard";
import { OperationsSection } from "./OperationsSection";
import { ActionsSection } from "./ActionsSection";
import { TrendsSection } from "./TrendsSection";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { DEFAULT_PERIOD, PERIOD_KEYS, toIstYmd, type PeriodKey } from "@/lib/dashboard/periods";
import { isWidgetError, type DashboardPayload, type SetupState } from "@/lib/dashboard/types";

function isPeriodKey(value: string | null): value is PeriodKey {
  return value !== null && PERIOD_KEYS.includes(value as PeriodKey);
}

function selectionFromSearch(search: string): DashboardSelection {
  const params = new URLSearchParams(search);
  const periodParam = params.get("period");
  return {
    period: isPeriodKey(periodParam) ? periodParam : DEFAULT_PERIOD,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
}

function writeSelectionToUrl(selection: DashboardSelection) {
  const params = new URLSearchParams();
  params.set("period", selection.period);
  if (selection.period === "custom") {
    if (selection.from) params.set("from", selection.from);
    if (selection.to) params.set("to", selection.to);
  }
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  window.dispatchEvent(new Event("dashboard-location-change"));
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("dashboard-location-change", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("dashboard-location-change", onChange);
  };
}

function readLocationSearch() {
  return window.location.search;
}

function subscribeToHydration() {
  return () => {};
}

function readHydrated() {
  return true;
}

function SetupChecklist({ setup }: { setup: SetupState }) {
  const tasks = [
    { href: "/admin/settings", label: "Complete company profile", done: setup.hasCompanyName },
    { href: "/admin/customers", label: "Add a customer", done: setup.hasCustomers },
    { href: "/admin/consignment/new", label: "Create first bilty", done: setup.hasConsignments },
  ];
  return (
    <section className="border-t border-neutral-200 pt-4 dark:border-brand-800" aria-labelledby="setup-title">
      <h2 id="setup-title" className="text-sm font-semibold text-neutral-900 dark:text-white">Set up your workspace</h2>
      <ul className="mt-2 divide-y divide-neutral-200 dark:divide-brand-800">
        {tasks.map((task) => (
          <li key={task.href} className="py-2">
            {task.done ? (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{task.label} · Done</span>
            ) : (
              <Link href={task.href} className="focus-ring rounded text-sm text-brand-700 hover:underline dark:text-accent-300">{task.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardClient() {
  const search = useSyncExternalStore(subscribeToLocation, readLocationSearch, () => "");
  const hydrated = useSyncExternalStore(subscribeToHydration, readHydrated, () => false);
  const selection = selectionFromSearch(search);
  const { period, from, to } = selection;
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [completedRequest, setCompletedRequest] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<{ key: string; message: string } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const rangeInvalid = Boolean(period === "custom" && from && to && from > to);
  const rangeReady = period !== "custom" || Boolean(from && to);
  const requestKey = `${period}:${from}:${to}:${refreshCount}`;
  const canRequest = hydrated && rangeReady && !rangeInvalid;
  const loading = canRequest && completedRequest !== requestKey;
  const error = failedRequest?.key === requestKey ? failedRequest.message : "";

  useEffect(() => {
    if (!hydrated || new URLSearchParams(search).has("period")) return;
    writeSelectionToUrl({ period, from, to });
  }, [from, hydrated, period, search, to]);

  useEffect(() => {
    if (!canRequest) return;
    const controller = new AbortController();
    async function load() {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        params.set("from", from);
        params.set("to", to);
      }
      try {
        const response = await fetch(`/api/admin/dashboard?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
              ? result.message
              : "Couldn't load the dashboard.";
          throw new Error(message);
        }
        if (typeof result !== "object" || result === null || !("meta" in result)) {
          throw new Error("The dashboard response was incomplete.");
        }
        if (controller.signal.aborted) return;
        setPayload(result as DashboardPayload);
        setFailedRequest(null);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        const message = loadError instanceof Error ? loadError.message : "Couldn't load the dashboard.";
        setFailedRequest({ key: requestKey, message });
        console.error("Unable to load dashboard:", loadError);
      } finally {
        if (!controller.signal.aborted) setCompletedRequest(requestKey);
      }
    }
    void load();
    return () => controller.abort();
  }, [canRequest, from, period, requestKey, to]);

  const onPeriodChange = useCallback((nextPeriod: PeriodKey) => {
    const next = nextPeriod === "custom"
      ? { period: nextPeriod, from: selection.from || toIstYmd(new Date()), to: selection.to || toIstYmd(new Date()) }
      : { ...selection, period: nextPeriod };
    writeSelectionToUrl(next);
  }, [selection]);

  const onDateChange = useCallback((field: "from" | "to", value: string) => {
    writeSelectionToUrl({ ...selection, period: "custom", [field]: value });
  }, [selection]);

  const retry = useCallback(() => setRefreshCount((count) => count + 1), []);
  const setup = payload && !isWidgetError(payload.setup) ? payload.setup : null;
  const showError = Boolean(error && !payload);

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 px-3 pb-10 pt-4 sm:px-5 lg:px-7">
      <DashboardHeader
        selection={selection}
        loading={loading}
        onPeriodChange={onPeriodChange}
        onDateChange={onDateChange}
        onRefresh={retry}
      />
      {selection.period === "custom" && (!selection.from || !selection.to) && (
        <p className="text-xs text-neutral-500" role="status">Choose both dates to load this custom range.</p>
      )}
      {rangeInvalid && <p className="text-sm text-error-700 dark:text-error-300" role="alert">The start date must be on or before the end date.</p>}
      {error && payload && (
        <div role="status" className="flex items-center justify-between gap-3 border border-warning-200 px-3 py-2 text-xs text-warning-900 dark:border-warning-900 dark:text-warning-100">
          <span>Refresh failed. Showing the last loaded data.</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>Retry</Button>
        </div>
      )}
      {showError ? (
        <ErrorState title="Dashboard unavailable" description={error} onRetry={retry} />
      ) : !payload && loading ? (
        <DashboardSkeleton />
      ) : !payload ? (
        <Card className="border-neutral-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">Select a valid custom date range to load the dashboard.</p>
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>
          {setup?.isNewCompany ? (
            <SetupChecklist setup={setup} />
          ) : (
            <>
              <FinancialsSection
                financials={payload.financials}
                receivables={payload.receivables}
                payables={payload.payables}
                compareLabel={payload.meta.period.compareLabel}
                onRetry={retry}
              />
              <section className="grid gap-4 lg:grid-cols-12" aria-label="Financial chart and attention">
                <div className="lg:col-span-8">
                  <TrendsSection financials={payload.financials} onRetry={retry} />
                </div>
                <div className="lg:col-span-4">
                  <ActionsSection actions={payload.actions} onRetry={retry} />
                </div>
              </section>
              <section aria-label="Receivables and payables" className="grid gap-4 lg:grid-cols-2">
                <PartySnapshotCard snapshot={payload.receivables} kind="customer" onRetry={retry} />
                <PartySnapshotCard snapshot={payload.payables} kind="supplier" onRetry={retry} />
              </section>
              <OperationsSection activeTrips={payload.activeTrips} bookings={payload.bookings} onRetry={retry} />
            </>
          )}
        </div>
      )}
    </main>
  );
}
