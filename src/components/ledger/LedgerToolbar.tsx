"use client";

import { SlidersHorizontal } from "@/components/ledger/ledger-icons";
import { useEffect, useRef, useState } from "react";
import { Search } from "@/components/icons";
import { cn } from "@/lib/utils";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";
import { activePeriod, periodRange, PERIODS } from "@/lib/ledger/periods";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import type { LedgerFilterState } from "@/redux/slices/ledgerSlice";

interface LedgerToolbarProps {
  kind: PartyKind;
  value: LedgerFilterState;
  /** Any filter differs from the default. */
  active: boolean;
  onChange: (next: LedgerFilterState) => void;
  showBalance: boolean;
  /** Running balance needs the unfiltered, top-of-ledger list. */
  balanceAvailable: boolean;
  onShowBalanceChange: (next: boolean) => void;
}

const chip = (on: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
    on
      ? "border-(--ledger-edge) bg-(--ledger-accent-soft) text-(--ledger-edge)"
      : "border-(--ledger-line) bg-(--ledger-card) text-neutral-600 hover:bg-(--ledger-surface) dark:text-neutral-300"
  );

export function LedgerToolbar({ kind, value, active, onChange, showBalance, balanceAvailable, onShowBalanceChange }: LedgerToolbarProps) {
  const cfg = PARTY_CONFIG[kind];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const period = activePeriod(value.from, value.to);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="space-y-2 px-3 pt-3">
      <div role="group" aria-label="Period" className="flex gap-1.5 overflow-x-auto pb-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={period === p.key}
            className={chip(period === p.key)}
            onClick={() => onChange({ ...value, ...periodRange(p.key) })}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <button type="button" aria-pressed className={chip(true)} onClick={() => setOpen(true)}>
            Custom range
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Entry type" className="flex rounded-lg bg-(--ledger-surface) p-0.5 ring-1 ring-inset ring-(--ledger-line)">
          {cfg.typeFilters.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={value.type === t.key}
              onClick={() => onChange({ ...value, type: t.key })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                value.type === t.key
                  ? "bg-(--ledger-card) text-neutral-900 shadow-sm dark:text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-36 flex-1">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            maxLength={100}
            placeholder={cfg.searchPlaceholder}
            aria-label={`Search by ${cfg.searchPlaceholder.toLowerCase()}`}
            className="h-9 w-full rounded-lg border border-(--ledger-line) bg-(--ledger-card) pl-8 pr-2 text-sm outline-none focus:border-(--ledger-edge)"
          />
        </div>

        <label
          className={cn("flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300", !balanceAvailable && "opacity-50")}
          title={balanceAvailable ? undefined : "Running balance is shown for the full ledger only. Reset the filters to use it."}
        >
          <input
            type="checkbox"
            checked={showBalance && balanceAvailable}
            disabled={!balanceAvailable}
            onChange={(e) => onShowBalanceChange(e.target.checked)}
          />
          Balance
        </label>

        <div className="relative" ref={ref}>
          <button
            type="button"
            aria-label="More filters"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-(--ledger-line) bg-(--ledger-card) text-neutral-600 hover:bg-(--ledger-surface)"
          >
            <SlidersHorizontal size={16} />
            {active && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-(--ledger-edge) ring-2 ring-(--ledger-card)" />}
          </button>
          {open && <LedgerFilters value={value} onChange={onChange} onClose={() => setOpen(false)} showUnbilled={kind === "customer"} />}
        </div>
      </div>
    </div>
  );
}
