"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Search } from "@/components/icons";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ConsignmentSort } from "@/lib/api/consignments";

export interface Filters {
  search: string;
  paymentStatus: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  consignor: string;
  consignee: string;
  vehicle: string;
  sort: ConsignmentSort;
}

export const EMPTY_FILTERS: Filters = {
  search: "", paymentStatus: "", from: "", to: "", fromCity: "", toCity: "",
  consignor: "", consignee: "", vehicle: "", sort: "newest",
};

const PAYMENT_OPTIONS = [
  { value: "", label: "All payment statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
];

const SORT_OPTIONS: { value: ConsignmentSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "booking_newest", label: "Booking date ↓" },
  { value: "booking_oldest", label: "Booking date ↑" },
];

const ADVANCED: (keyof Filters)[] = ["fromCity", "toCity", "consignor", "consignee", "vehicle"];

/** Number of filters in effect (sort doesn't count). */
export function activeFilterCount(f: Filters): number {
  return (Object.keys(f) as (keyof Filters)[]).filter((k) => k !== "sort" && f[k] !== "").length;
}

export function FilterBar({
  filters, onChange, onClear, dateError,
}: {
  filters: Filters; onChange: (patch: Partial<Filters>) => void; onClear: () => void; dateError?: string;
}) {
  const advancedActive = ADVANCED.some((k) => filters[k] !== "");
  const [showMore, setShowMore] = useState(advancedActive);
  const count = activeFilterCount(filters);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search LR no, vehicle, party, e-way bill…"
            aria-label="Search"
            startIcon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>
        <Select
          aria-label="Payment status"
          options={PAYMENT_OPTIONS}
          value={filters.paymentStatus}
          onChange={(e) => onChange({ paymentStatus: e.target.value })}
        />
        <Input type="date" aria-label="From date" title="Booked from" value={filters.from}
          max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
        <Input type="date" aria-label="To date" title="Booked up to" value={filters.to}
          min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-body-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> More filters
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-body-sm font-medium text-error-600 hover:bg-error-50"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Clear {count} filter{count > 1 ? "s" : ""}
            </button>
          )}
          {dateError && <span role="alert" className="text-body-sm text-error-600">{dateError}</span>}
        </div>
        <div className="w-44">
          <Select
            aria-label="Sort"
            options={SORT_OPTIONS}
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as ConsignmentSort })}
          />
        </div>
      </div>

      {showMore && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="From city" aria-label="From city" value={filters.fromCity}
            onChange={(e) => onChange({ fromCity: e.target.value })} />
          <Input placeholder="To city" aria-label="To city" value={filters.toCity}
            onChange={(e) => onChange({ toCity: e.target.value })} />
          <Input placeholder="Consignor" aria-label="Consignor" value={filters.consignor}
            onChange={(e) => onChange({ consignor: e.target.value })} />
          <Input placeholder="Consignee" aria-label="Consignee" value={filters.consignee}
            onChange={(e) => onChange({ consignee: e.target.value })} />
          <Input placeholder="Vehicle no" aria-label="Vehicle number" value={filters.vehicle}
            onChange={(e) => onChange({ vehicle: e.target.value })} />
        </div>
      )}
    </div>
  );
}
