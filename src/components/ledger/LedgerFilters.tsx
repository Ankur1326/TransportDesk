"use client";

import { Button } from "@/components/Button";
import type { LedgerTypeFilter } from "@/lib/ledger/build-ledger";
import { DEFAULT_LEDGER_FILTERS, type LedgerFilterState } from "@/redux/slices/ledgerSlice";

const field =
  "h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function LedgerFilters({
  value,
  onChange,
  onClose,
}: {
  value: LedgerFilterState;
  onChange: (next: LedgerFilterState) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof LedgerFilterState>(key: K, v: LedgerFilterState[K]) => onChange({ ...value, [key]: v });
  return (
    <div
      role="dialog"
      aria-label="Ledger filters"
      className="absolute right-3 top-12 z-20 w-72 space-y-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
        Bill / LR number
        <input className={field} value={value.search} onChange={(e) => set("search", e.target.value)} maxLength={100} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          From
          <input type="date" className={field} value={value.from} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          To
          <input type="date" className={field} value={value.to} onChange={(e) => set("to", e.target.value)} />
        </label>
      </div>
      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
        Type
        <select
          className={field}
          value={value.type}
          onChange={(e) => set("type", e.target.value as LedgerTypeFilter)}
        >
          <option value="all">All</option>
          <option value="receivable">Receivable (Dr)</option>
          <option value="received">Received (Cr)</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
        <input
          type="checkbox"
          checked={value.includeUnbilled}
          onChange={(e) => set("includeUnbilled", e.target.checked)}
        />
        Include unbilled bilty
      </label>
      <div className="flex justify-between">
        <Button size="sm" variant="ghost" onClick={() => onChange(DEFAULT_LEDGER_FILTERS)}>
          Reset
        </Button>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
