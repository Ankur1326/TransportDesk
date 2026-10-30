import { ArrowDownLeft, ArrowUpRight } from "@/components/ledger/ledger-icons";
import { FileText } from "@/components/icons";
import type { LedgerSummary } from "@/lib/ledger/build-ledger";
import { formatInr } from "@/lib/ledger/format";

/** Three stat tiles for the filtered period. Name kept from the earlier chip layout. */
export function LedgerSummaryChips({ summary }: { summary: LedgerSummary }) {
  const tile = "flex items-center gap-3 rounded-xl border border-(--ledger-line) bg-(--ledger-card) px-3 py-2.5";
  const icon = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg";
  return (
    <div className="grid grid-cols-3 gap-2 px-3 pt-3">
      <div className={tile}>
        <span className={`${icon} bg-(--ledger-accent-soft) text-(--ledger-edge)`} aria-hidden="true"><FileText size={16} /></span>
        <span className="min-w-0">
          <span className="block text-[11px] text-neutral-500">Entries</span>
          <span className="block truncate text-sm font-semibold tabular-nums">{summary.entries}</span>
        </span>
      </div>
      <div className={tile} title="Total receivable (Dr)">
        <span className={`${icon} bg-(--receivable-soft) text-(--receivable)`} aria-hidden="true"><ArrowUpRight size={16} /></span>
        <span className="min-w-0">
          <span className="block text-[11px] text-neutral-500">Receivable (Dr)</span>
          <span className="block truncate text-sm font-semibold tabular-nums text-(--receivable)">{formatInr(summary.totalReceivable)}</span>
        </span>
      </div>
      <div className={tile} title="Total received (Cr)">
        <span className={`${icon} bg-(--received-soft) text-(--received)`} aria-hidden="true"><ArrowDownLeft size={16} /></span>
        <span className="min-w-0">
          <span className="block text-[11px] text-neutral-500">Received (Cr)</span>
          <span className="block truncate text-sm font-semibold tabular-nums text-(--received)">{formatInr(summary.totalReceived)}</span>
        </span>
      </div>
    </div>
  );
}
