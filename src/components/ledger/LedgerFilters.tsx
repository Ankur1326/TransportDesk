"use client";

import { Button } from "@/components/Button";
import { DEFAULT_LEDGER_FILTERS, type LedgerFilterState } from "@/redux/slices/ledgerSlice";

const field =
  "h-9 w-full rounded-lg border border-(--ledger-line) bg-(--ledger-card) px-2 text-sm outline-none focus:border-(--ledger-edge)";

/** Popover with the less-used filters: a custom date range and the unbilled-bilty toggle. */
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
      aria-label="More ledger filters"
      className="absolute right-0 top-11 z-20 w-72 space-y-3 rounded-xl border border-(--ledger-line) bg-(--ledger-card) p-3 shadow-lg"
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          From
          <input type="date" className={field} value={value.from} max={value.to || undefined} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          To
          <input type="date" className={field} value={value.to} min={value.from || undefined} onChange={(e) => set("to", e.target.value)} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-200">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={value.includeUnbilled}
          onChange={(e) => set("includeUnbilled", e.target.checked)}
        />
        <span>
          Include unbilled bilty
          <span className="block text-xs text-neutral-500">Bilties not yet on a bill count as receivable.</span>
        </span>
      </label>
      <div className="flex justify-between">
        <Button size="sm" variant="ghost" onClick={() => onChange(DEFAULT_LEDGER_FILTERS)}>
          Reset all
        </Button>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
