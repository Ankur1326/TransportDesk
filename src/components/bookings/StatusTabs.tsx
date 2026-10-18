"use client";

import type { ConsignmentCounts } from "@/lib/api/consignments";
import { LR_STATUSES, type LrStatus } from "@/lib/consignment-status";

export type StatusTab = "All" | LrStatus;
export const STATUS_TABS: StatusTab[] = ["All", ...LR_STATUSES];

export function StatusTabs({
  value, counts, onChange,
}: {
  value: StatusTab; counts: ConsignmentCounts | null; onChange: (tab: StatusTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
      {STATUS_TABS.map((tab) => {
        const active = value === tab;
        const n = counts?.[tab];
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-body-sm font-medium transition ${
              active
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {tab}
            {typeof n === "number" && (
              <span
                className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 ${
                  active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
