import { CheckCircle2, FileText, Receipt } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/lib/ledger/build-ledger";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";

export function entryTitle(e: LedgerEntry): string {
  if (e.type === "Invoice") return `Invoice - ${e.refNo}`;
  if (e.type === "Bilty") return `Bilty - ${e.refNo}`;
  return e.refNo;
}

export function LedgerEntryRow({
  entry,
  selected,
  onOpen,
}: {
  entry: LedgerEntry;
  selected: boolean;
  onOpen: (entry: LedgerEntry) => void;
}) {
  const receivable = entry.side === "receivable";
  const Icon = receivable ? FileText : Receipt;
  return (
    <li className="border-b border-black/5 dark:border-white/10">
      <button
        type="button"
        onClick={() => onOpen(entry)}
        aria-label={`${entryTitle(entry)}, ${entry.label}, ${receivable ? "receivable" : "received"} ${formatInr(entry.amount)}`}
        className={cn(
          "flex w-full items-center gap-3 py-2.5 pl-3 text-left hover:bg-black/5 dark:hover:bg-white/5",
          selected && "bg-black/5 dark:bg-white/10"
        )}
      >
        <span className="relative shrink-0 text-neutral-500" aria-hidden="true">
          <Icon size={26} />
          {!receivable && <CheckCircle2 size={14} className="absolute -bottom-1 -right-1 text-(--received)" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-neutral-500">{formatLedgerDate(entry.date)}</span>
          <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">{entryTitle(entry)}</span>
          <span className="block text-xs text-neutral-500">{entry.label}</span>
        </span>
        <span className={cn("shrink-0 text-sm", receivable ? "text-(--receivable)" : "text-(--received)")}>
          {formatInr(entry.amount)}
          <span className="ml-1 text-[10px] font-semibold">{receivable ? "Dr" : "Cr"}</span>
        </span>
        <span aria-hidden="true" className="ml-1 h-12 w-1.5 shrink-0 rounded-l bg-(--ledger-edge)" />
      </button>
    </li>
  );
}
