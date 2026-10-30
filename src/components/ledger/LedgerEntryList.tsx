import type { LedgerEntry } from "@/lib/ledger/build-ledger";
import { formatInr } from "@/lib/ledger/format";
import { LedgerEntryRow } from "@/components/ledger/LedgerEntryRow";

interface Group {
  key: string;
  label: string;
  items: { entry: LedgerEntry; index: number }[];
}

/** Groups a newest-first list by calendar month (local time), keeping the order. */
function groupByMonth(entries: LedgerEntry[]): Group[] {
  const groups: Group[] = [];
  entries.forEach((entry, index) => {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), items: [] };
      groups.push(g);
    }
    g.items.push({ entry, index });
  });
  return groups;
}

/**
 * Entries under sticky month headings. A month's totals are shown only when the
 * whole month is loaded: while more pages remain, the last group may be cut off.
 */
export function LedgerEntryList({
  entries,
  openId,
  balances,
  hasMore,
  onOpen,
}: {
  entries: LedgerEntry[];
  openId: string | null;
  /** Running balance per entry (same order), or null to hide. */
  balances: number[] | null;
  hasMore: boolean;
  onOpen: (entry: LedgerEntry) => void;
}) {
  const groups = groupByMonth(entries);
  return (
    <div className="px-1 pb-2">
      {groups.map((g, gi) => {
        const complete = !(hasMore && gi === groups.length - 1);
        let dr = 0;
        let cr = 0;
        for (const { entry } of g.items) {
          if (entry.side === "receivable") dr += Math.round(entry.amount * 100);
          else cr += Math.round(entry.amount * 100);
        }
        return (
          <section key={g.key} aria-label={g.label}>
            <h3 className="sticky top-0 z-10 flex items-center justify-between bg-(--ledger-surface)/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 backdrop-blur">
              <span>{g.label}</span>
              {complete && (
                <span className="font-medium normal-case tracking-normal tabular-nums">
                  <span className="text-(--receivable)">Dr {formatInr(dr / 100)}</span>
                  <span className="mx-1.5 text-neutral-300">|</span>
                  <span className="text-(--received)">Cr {formatInr(cr / 100)}</span>
                </span>
              )}
            </h3>
            <ul>
              {g.items.map(({ entry, index }) => (
                <LedgerEntryRow
                  key={entry.id}
                  entry={entry}
                  selected={openId === entry.id}
                  balance={balances ? balances[index] : undefined}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
