import type { Ageing, AgeingBucket } from "@/lib/ledger/ageing";
import { formatInr } from "@/lib/ledger/format";
import { cn } from "@/lib/utils";

/** Older buckets get warmer colours; the bucket label is always text too. */
const TONE: Record<AgeingBucket["key"], string> = {
  "0-30": "text-neutral-700 dark:text-neutral-200",
  "31-60": "text-(--partial)",
  "61-90": "text-(--receivable)",
  "90+": "text-(--receivable)",
};

export function LedgerAgeing({ ageing }: { ageing: Ageing }) {
  if (ageing.total <= 0) return null;
  return (
    <section aria-label="Open invoices by age" className="px-3 pb-1">
      <p
        className="mb-1 text-[11px] font-medium text-neutral-500"
        title="Counted from each bill's date. The opening balance and advances not applied to a bill are not included."
      >
        Open invoices by age · {formatInr(ageing.total)} due
      </p>
      <ul className="grid grid-cols-4 gap-2">
        {ageing.buckets.map((b) => (
          <li key={b.key} className="rounded-md bg-white/70 px-2 py-1 text-center dark:bg-white/10">
            <span className="block text-[10px] text-neutral-500">{b.label}</span>
            <span className={cn("block text-xs font-semibold", b.amount > 0 ? TONE[b.key] : "text-neutral-400")}>
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
