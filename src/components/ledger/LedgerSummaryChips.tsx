import type { LedgerSummary } from "@/lib/ledger/build-ledger";
import { formatInr } from "@/lib/ledger/format";

export function LedgerSummaryChips({ summary }: { summary: LedgerSummary }) {
  const chip = "rounded-md bg-white/70 px-3 py-1.5 text-center text-xs font-semibold dark:bg-white/10";
  return (
    <div className="grid grid-cols-3 gap-2 px-3 py-2">
      <span className={`${chip} text-neutral-600 dark:text-neutral-300`}>{summary.entries} ENTRIES</span>
      <span className={`${chip} text-(--receivable)`} title="Total receivable (Dr)">
        <span className="sr-only">Receivable </span>
        {formatInr(summary.totalReceivable)}
      </span>
      <span className={`${chip} text-(--received)`} title="Total received (Cr)">
        <span className="sr-only">Received </span>
        {formatInr(summary.totalReceived)}
      </span>
    </div>
  );
}
