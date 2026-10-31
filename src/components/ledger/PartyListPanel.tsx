"use client";

import { useEffect, useState } from "react";
import { Plus, Search, X } from "@/components/icons";
import { Button } from "@/components/Button";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { cn } from "@/lib/utils";
import type { ApiErrorInfo } from "@/lib/api/errors";
import type { PartySummary } from "@/redux/slices/ledgerSlice";
import { formatInr } from "@/lib/ledger/format";
import { PartyListSkeleton } from "@/components/ledger/LedgerSkeleton";
import { BalancePill, LedgerAvatar } from "@/components/ledger/LedgerAvatar";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";

interface PartyListPanelProps {
  kind: PartyKind;
  parties: PartySummary[];
  /** Total customers matching the search (all pages). */
  total: number;
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
  kind,
  parties,
  total,
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
  const cfg = PARTY_CONFIG[kind];
  const [text, setText] = useState("");

  // Debounce 300ms.
  useEffect(() => {
    const t = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, onSearch]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-(--ledger-card)">
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{cfg.plural}</h1>
          {total > 0 && <span className="text-xs text-neutral-500">{total} {total === 1 ? "party" : "parties"}</span>}
        </div>
        <div className="relative mt-3">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search name, mobile or GSTIN"
            aria-label={`Search ${cfg.plural.toLowerCase()}`}
            className="h-10 w-full rounded-full border border-(--ledger-line) bg-(--ledger-surface) pl-9 pr-9 text-sm outline-none transition focus:border-(--ledger-edge) focus:ring-2 focus:ring-(--ledger-accent-soft) [&::-webkit-search-cancel-button]:appearance-none"
          />
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {error && parties.length === 0 ? (
          <ApiErrorState error={error} onRetry={onRetry} className="m-2" />
        ) : isLoading && parties.length === 0 ? (
          <PartyListSkeleton />
        ) : parties.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">
            {text ? `No ${cfg.noun} matches your search.` : `No ${cfg.plural.toLowerCase()} yet. Add your first one below.`}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {parties.map((p) => {
              const selected = p._id === selectedId;
              const tone = p.netBalance > 0 ? cfg.net.positiveText : p.netBalance < 0 ? cfg.net.negativeText : "text-neutral-500";
              return (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p._id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-(--ledger-accent-soft) ring-1 ring-inset ring-(--ledger-edge)/30"
                        : "hover:bg-(--ledger-surface)"
                    )}
                  >
                    <LedgerAvatar name={p.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{p.name}</span>
                      <span className="block truncate text-xs text-neutral-500">{p.mobile || p.gstin || "No contact"}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{formatInr(p.netBalance)}</span>
                      <BalancePill net={p.netBalance} kind={kind} />
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

      <div className="border-t border-(--ledger-line) p-3">
        <Button className="w-full" onClick={onAdd}>
          <Plus size={16} aria-hidden="true" /> Add {cfg.noun}
        </Button>
      </div>
    </div>
  );
}
