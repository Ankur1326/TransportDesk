"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Filter } from "@/components/icons";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/ledger/format";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import type { LedgerFilterState } from "@/redux/slices/ledgerSlice";

interface LedgerHeaderProps {
  name: string;
  /** Unfiltered net balance; > 0 means the customer owes us. */
  netBalance: number;
  filters: LedgerFilterState;
  filtersActive: boolean;
  onFiltersChange: (next: LedgerFilterState) => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function LedgerHeader({
  name,
  netBalance,
  filters,
  filtersActive,
  onFiltersChange,
  onBack,
  onEdit,
  onDelete,
}: LedgerHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const owes = netBalance > 0;
  const item = "block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div className="relative rounded-md bg-(--ledger-card) p-4 shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <button type="button" onClick={onBack} aria-label="Back to customer list" className="mt-0.5 md:hidden">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</h2>
            <p className="mt-2 text-xs text-neutral-500">
              NET BALANCE{" "}
              <span className={cn("text-sm font-semibold", owes ? "text-(--receivable)" : "text-(--received)")}>
                {formatInr(netBalance)}
              </span>
              <span className="ml-1 font-semibold">{owes ? "Dr (Receivable)" : netBalance < 0 ? "Cr (Advance)" : "(Settled)"}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" ref={ref}>
          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="px-2 py-1 text-xl leading-none"
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
              >
                <button role="menuitem" className={item} onClick={() => { setMenuOpen(false); onEdit(); }}>
                  Edit customer
                </button>
                <button role="menuitem" className={cn(item, "cursor-not-allowed opacity-50")} disabled title="Coming soon">
                  Download statement
                </button>
                <button role="menuitem" className={cn(item, "cursor-not-allowed opacity-50")} disabled title="Coming soon">
                  Share on WhatsApp
                </button>
                <button
                  role="menuitem"
                  className={cn(item, "text-(--receivable)")}
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                >
                  Delete customer
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Filter ledger"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((v) => !v)}
            className="relative px-2 py-1"
          >
            <Filter size={18} />
            {filtersActive && <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-(--ledger-edge)" />}
          </button>
        </div>
      </div>
      {filterOpen && (
        <LedgerFilters value={filters} onChange={onFiltersChange} onClose={() => setFilterOpen(false)} />
      )}
    </div>
  );
}
