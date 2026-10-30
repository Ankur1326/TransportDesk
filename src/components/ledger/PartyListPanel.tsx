"use client";

import { useEffect, useState } from "react";
import { Search } from "@/components/icons";
import { Button } from "@/components/Button";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { cn } from "@/lib/utils";
import type { ApiErrorInfo } from "@/lib/api/errors";
import type { PartySummary } from "@/redux/slices/ledgerSlice";
import { formatInr, isReceivable } from "@/lib/ledger/format";
import { PartyListSkeleton } from "@/components/ledger/LedgerSkeleton";

interface PartyListPanelProps {
  parties: PartySummary[];
  isLoading: boolean;
  error: ApiErrorInfo | null;
  hasMore: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSearch: (value: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onAdd: () => void;
}

export function PartyListPanel({
  parties,
  isLoading,
  error,
  hasMore,
  selectedId,
  onSelect,
  onSearch,
  onLoadMore,
  onRetry,
  onAdd,
}: PartyListPanelProps) {
  const [text, setText] = useState("");

  // Debounce 300ms.
  useEffect(() => {
    const t = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, onSearch]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-(--ledger-surface)">
      <div className="flex gap-0 p-3">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search name / mobile / GSTIN"
          aria-label="Search customers"
          className="h-10 w-full rounded-l-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-(--ledger-edge) dark:border-neutral-700 dark:bg-neutral-900"
        />
        <span className="flex h-10 w-11 items-center justify-center rounded-r-md bg-(--ledger-edge) text-white" aria-hidden="true">
          <Search size={18} />
        </span>
      </div>

      <div className="flex justify-between px-4 pb-1 text-xs font-medium text-neutral-500">
        <span>Name</span>
        <span>Amount</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && parties.length === 0 ? (
          <ApiErrorState error={error} onRetry={onRetry} className="m-3" />
        ) : isLoading && parties.length === 0 ? (
          <PartyListSkeleton />
        ) : parties.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">No customers found.</p>
        ) : (
          <ul>
            {parties.map((p) => {
              const owes = isReceivable(p.netBalance);
              const selected = p._id === selectedId;
              return (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p._id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      selected ? "bg-white dark:bg-neutral-800" : "hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-500 font-semibold text-white"
                    >
                      {p.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-800 dark:text-neutral-100">{p.name}</span>
                      {p.mobile ? <span className="block text-xs text-neutral-500">{p.mobile}</span> : null}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm",
                        owes ? "text-(--receivable)" : "text-(--received)"
                      )}
                    >
                      {formatInr(p.netBalance)}
                      <span className="ml-1 text-[10px] font-semibold">{owes ? "Dr" : p.netBalance < 0 ? "Cr" : ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && (
          <div className="p-3 text-center">
            <Button size="sm" variant="outline" onClick={onLoadMore} isLoading={isLoading}>
              Load more
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white p-3 dark:bg-neutral-900">
        <Button className="w-full" onClick={onAdd}>
          Add Customer
        </Button>
      </div>
    </div>
  );
}
