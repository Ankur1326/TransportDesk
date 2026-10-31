import type { Ageing, AgeingBucket } from "@/lib/ledger/ageing";
import { formatInr } from "@/lib/ledger/format";
import { cn } from "@/lib/utils";

/** Older buckets get warmer colours; every bucket is also labelled with text and an amount. */
const BAR: Record<AgeingBucket["key"], string> = {
  "0-30": "bg-(--received)",
  "31-60": "bg-(--partial)",
  "61-90": "bg-(--receivable)/70",
  "90+": "bg-(--receivable)",
};

export function LedgerAgeing({ ageing, docPlural = "invoices" }: { ageing: Ageing; docPlural?: string }) {
  if (ageing.total <= 0) return null;
  return (
    <section
      aria-label={`Open ${docPlural} by age`}
      className="mx-3 mt-3 rounded-xl border border-(--ledger-line) bg-(--ledger-card) px-3 py-2.5"
    >
      <p
        className="flex items-center justify-between text-[11px] font-medium text-neutral-500"
        title="Counted from each bill's date. The opening balance and advances not applied to a bill are not included."
      >
        <span>Open {docPlural} by age</span>
        <span className="font-semibold text-neutral-700 dark:text-neutral-200">{formatInr(ageing.total)} due</span>
      </p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-(--ledger-surface)" role="img" aria-label="Share of dues by age">
        {ageing.buckets.map((b) =>
          b.amount > 0 ? (
            <span key={b.key} className={BAR[b.key]} style={{ width: `${(b.amount / ageing.total) * 100}%` }} />
          ) : null
        )}
      </div>
      <ul className="mt-2 grid grid-cols-4 gap-2">
        {ageing.buckets.map((b) => (
          <li key={b.key} className="min-w-0">
            <span className="flex items-center gap-1 text-[10px] text-neutral-500">
              <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", BAR[b.key])} />
              {b.label}
            </span>
            <span className={cn("block truncate text-xs font-semibold tabular-nums", b.amount > 0 ? "" : "text-neutral-400")}>
              {formatInr(b.amount)}
            </span>
            {b.count > 0 && (
              <span className="block text-[10px] text-neutral-500">
                {b.count} {b.count === 1 ? "bill" : "bills"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
