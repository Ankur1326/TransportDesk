"use client";
import { useState, type ReactNode } from "react";
import Table from "@/components/Table";
import Pagination from "@/components/Pagination";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { useReportRows, type ReportState } from "@/hooks/useReportRows";

export interface ReportFilters {
  search: string;
  from?: string;
  to?: string;
  currentPage: number;
  itemsPerPage: number;
}

/**
 * Shared shell for the Vehicles / Drivers / Trip-profit lists: server-side
 * search + pagination on top of the existing Table and Pagination components.
 */
export default function ReportTable<T, S = never>({
  endpoint,
  headings,
  renderCell,
  header,
  extraParams,
}: {
  endpoint: string;
  headings: string[];
  renderCell: (row: T, key: string) => ReactNode;
  /** Rendered above the table; receives the loaded state (e.g. summary cards). */
  header?: (state: ReportState<T, S>) => ReactNode;
  extraParams?: Record<string, string | undefined>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);

  // Changing a filter (e.g. dates) goes back to page 1.
  const extraKey = JSON.stringify(extraParams ?? {});
  const [seenExtra, setSeenExtra] = useState(extraKey);
  if (seenExtra !== extraKey) {
    setSeenExtra(extraKey);
    setPage(1);
  }

  const state = useReportRows<T, S>(endpoint, { search, currentPage: page, itemsPerPage: per, ...extraParams });

  return (
    <div className="space-y-4 p-1">
      {state.error && (
        <ApiErrorState
          error={{ kind: "other", title: "Couldn't load this report", message: state.error }}
          onRetry={state.retry}
        />
      )}
      {header?.(state)}
      <Table<T>
        headings={headings}
        data={state.rows}
        isLoading={state.loading}
        handleSearch={(p?: { search?: string }) => {
          setSearch(p?.search ?? "");
          setPage(1);
        }}
        renderCell={renderCell}
        itemsPerPage={per}
      />
      <Pagination
        currentPage={page}
        totalPages={state.totalPages}
        itemsPerPage={per}
        totalItems={state.totalItems}
        handlePreviousPage={() => setPage((p) => Math.max(1, p - 1))}
        handleNextPage={() => setPage((p) => Math.min(state.totalPages, p + 1))}
        handleItemPerPageChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          setPer(Number(e.target.value));
          setPage(1);
        }}
      />
    </div>
  );
}
