import { ArrowDownLeft, ArrowUpRight } from "@/components/ledger/ledger-icons";
import { CheckCircle2, FileText } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/lib/ledger/build-ledger";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";

export function entryTitle(e: LedgerEntry): string {
  if (e.type === "Invoice") return `Invoice - ${e.refNo}`;
  if (e.type === "Bilty") return `Bilty - ${e.refNo}`;
  return e.refNo;
}

const metaText = (e: LedgerEntry, key: string): string => {
  const v = e.meta[key];
  return typeof v === "string" ? v : "";
};

export function LedgerEntryRow({
  entry,
  selected,
  balance,
  onOpen,
}: {
  entry: LedgerEntry;
  selected: boolean;
  /** Running balance after this entry; undefined hides it. */
  balance?: number;
  onOpen: (entry: LedgerEntry) => void;
}) {
  const receivable = entry.side === "receivable";
  const settled = entry.label === "Final settlement";
  const Icon = settled ? CheckCircle2 : receivable ? (entry.type === "Invoice" || entry.type === "Bilty" ? FileText : ArrowUpRight) : ArrowDownLeft;
  const mode = metaText(entry, "mode");
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        aria-label={`${entryTitle(entry)}, ${entry.label}, ${receivable ? "receivable" : "received"} ${formatInr(entry.amount)}`}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-(--ledger-surface)",
          selected && "bg-(--ledger-accent-soft) hover:bg-(--ledger-accent-soft)"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            receivable ? "bg-(--receivable-soft) text-(--receivable)" : "bg-(--received-soft) text-(--received)"
          )}
        >
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{entryTitle(entry)}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
            <span>{formatLedgerDate(entry.date)}</span>
            <span aria-hidden="true">·</span>
            <span>{entry.label}</span>
            {mode && (
              <span className="rounded bg-(--ledger-surface) px-1.5 py-px text-[10px] font-medium text-neutral-600 dark:text-neutral-300">{mode}</span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn("text-sm font-semibold tabular-nums", receivable ? "text-(--receivable)" : "text-(--received)")}>
            {formatInr(entry.amount)}
            <span className="ml-1 text-[10px] font-bold">{receivable ? "Dr" : "Cr"}</span>
          </span>
          {balance !== undefined && (
            <span className="text-[11px] tabular-nums text-neutral-500">
              Bal {formatInr(balance)} {balance > 0 ? "Dr" : balance < 0 ? "Cr" : ""}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
