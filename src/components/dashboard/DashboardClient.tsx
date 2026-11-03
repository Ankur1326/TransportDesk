"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { CompanySetupNotice } from "@/components/admin/CompanySetupNotice";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import { DashboardHeader, type DashboardSelection } from "./DashboardHeader";
import { KpiGrid } from "./KpiGrid";
import { PartySnapshotCard } from "./PartySnapshotCard";
import { OperationsSection } from "./OperationsSection";
import { ActionsSection } from "./ActionsSection";
import { TrendsSection } from "./TrendsSection";
import { ActivitySection } from "./ActivitySection";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { SectionTitle } from "./DashboardPrimitives";
import {
  DEFAULT_PERIOD,
  PERIOD_KEYS,
  toIstYmd,
  type PeriodKey,
} from "@/lib/dashboard/periods";
import {
  isWidgetError,
  type DashboardPayload,
  type SetupState,
  type Widget,
} from "@/lib/dashboard/types";
import { formatIstDate } from "@/lib/dashboard/ui-helpers";

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

function hasValue<T>(value: Widget<T>): value is T {
  return !isWidgetError(value);
}

function OnboardingCard({ setup }: { setup: SetupState }) {
  const tasks = [
    { href: "/admin/settings", label: "Complete company profile", detail: "Add your company name and details" },
    { href: "/admin/customers", label: "Add a customer", detail: "Create your first customer ledger" },
    { href: "/admin/consignment/new", label: "Create first bilty", detail: "Book your first consignment" },
  ];
  return (
    <Card className="rounded-2xl border-accent-200 bg-gradient-to-br from-accent-50 to-white p-5 dark:border-accent-900 dark:from-brand-900 dark:to-brand-950 sm:p-7">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300">Getting started</p>
        <SectionTitle>Welcome to your transport desk</SectionTitle>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          Set up your company and add your first customer or bilty. Your dashboard will fill in as you work.
        </p>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {tasks.map((task, index) => (
          <li key={task.href}>
            <Link href={task.href} className="focus-ring flex h-full gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-accent-300 dark:border-brand-700 dark:bg-brand-950">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-800 dark:bg-accent-950 dark:text-accent-200">{index + 1}</span>
              <span>
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{task.label}</span>
                <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{task.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {!setup.hasCompanyName && <p className="mt-4 text-xs text-neutral-500">Your company profile is incomplete.</p>}
    </Card>
  );
}

export function DashboardClient() {
  const { settings } = useCompanySettings();
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

  const onPeriodChange = useCallback((period: PeriodKey) => {
    const next = period === "custom"
      ? { period, from: selection.from || toIstYmd(new Date()), to: selection.to || toIstYmd(new Date()) }
      : { ...selection, period };
    writeSelectionToUrl(next);
  }, [selection]);

  const onDateChange = useCallback((field: "from" | "to", value: string) => {
    writeSelectionToUrl({ ...selection, period: "custom", [field]: value });
  }, [selection]);

  const retry = useCallback(() => setRefreshCount((count) => count + 1), []);
  const companyName = settings.companyName.trim() || payload?.company.name || null;
  const setup = payload && hasValue(payload.setup) ? payload.setup : null;
  const isNewCompany = Boolean(setup?.isNewCompany);
  const showError = Boolean(error && !payload);

  const generatedAt = payload?.meta.generatedAt;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 px-3 pb-10 pt-5 sm:px-5 lg:px-7">
      <DashboardHeader
        companyName={companyName}
        selection={selection}
        generatedAt={generatedAt}
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
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900 dark:border-warning-900 dark:bg-warning-950/40 dark:text-warning-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Refresh failed. Showing the last loaded data. {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>Try again</Button>
        </div>
      )}
      {showError ? (
        <ErrorState title="Dashboard unavailable" description={error} onRetry={retry} />
      ) : !payload && loading ? (
        <DashboardSkeleton />
      ) : !payload ? (
        <Card className="rounded-2xl border-neutral-200 bg-white p-5 dark:border-brand-800 dark:bg-brand-900">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            Select a valid custom date range to load the dashboard.
          </p>
        </Card>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>
          <CompanySetupNotice />
          {isNewCompany && setup ? (
            <OnboardingCard setup={setup} />
          ) : (
            <>
              <KpiGrid kpis={payload.kpis} receivables={payload.receivables} payables={payload.payables} onRetry={retry} />
              <section aria-label="Receivables and payables" className="grid gap-4 xl:grid-cols-2">
                <PartySnapshotCard snapshot={payload.receivables} kind="customer" onRetry={retry} />
                <PartySnapshotCard snapshot={payload.payables} kind="supplier" onRetry={retry} />
              </section>
              <OperationsSection pipeline={payload.pipeline} activeTrips={payload.activeTrips} lhc={payload.lhc} onRetry={retry} />
              <ActionsSection actions={payload.actions} onRetry={retry} />
              <TrendsSection trends={payload.trends} onRetry={retry} />
              <ActivitySection activity={payload.recent} onRetry={retry} />
              <p className="text-right text-[10px] text-neutral-400">
                Snapshot balances as of {formatIstDate(payload.meta.generatedAt, true)} IST
              </p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
