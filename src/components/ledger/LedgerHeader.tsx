"use client";

import { Banknote, BellRing, Download, Ellipsis, FilePlus } from "@/components/ledger/ledger-icons";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Phone } from "@/components/icons";
import { cn } from "@/lib/utils";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { BalancePill, LedgerAvatar } from "@/components/ledger/LedgerAvatar";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";

interface LedgerHeaderProps {
  kind: PartyKind;
  name: string;
  mobile?: string | null;
  gstin?: string;
  city?: string;
  /** Unfiltered net balance; > 0 means the customer owes us. */
  netBalance: number;
  /** ISO date of the newest entry in the unfiltered ledger, when known. */
  lastEntryDate?: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadStatement: () => void;
  onShareStatement: () => void;
  /** Customers only: ask them to pay. */
  onSendReminder: () => void;
  /** Suppliers only: opens the Paid (Debit) dialog. */
  onPayNow: () => void;
  /** Suppliers only: add a lorry hire contract. */
  onAddContract: () => void;
  /** True while a statement is being prepared (entries disable to stop double clicks). */
  statementBusy: boolean;
}

const iconBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-(--ledger-line) bg-(--ledger-card) px-3 text-xs font-medium text-neutral-700 transition hover:bg-(--ledger-surface) disabled:cursor-wait disabled:opacity-50 dark:text-neutral-200";

export function LedgerHeader({
  kind,
  name,
  mobile,
  gstin,
  city,
  netBalance,
  lastEntryDate,
  onBack,
  onEdit,
  onDelete,
  onDownloadStatement,
  onShareStatement,
  onSendReminder,
  onPayNow,
  onAddContract,
  statementBusy,
}: LedgerHeaderProps) {
  const cfg = PARTY_CONFIG[kind];
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const owes = netBalance > 0;
  const advance = netBalance < 0;
  const status = owes ? cfg.net.positiveStatus : advance ? cfg.net.negativeStatus : "Settled";
  const tone = owes ? cfg.net.positiveText : cfg.net.negativeText;
  const item = "block w-full px-4 py-2 text-left text-sm hover:bg-(--ledger-surface) disabled:opacity-50";
  const meta = [mobile, gstin && `GSTIN ${gstin}`, city].filter(Boolean).join("  ·  ");

  return (
    <div className="rounded-2xl border border-(--ledger-line) bg-(--ledger-card) p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to customer list"
          className="mt-1.5 rounded-lg p-1 text-neutral-600 hover:bg-(--ledger-surface) md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <LedgerAvatar name={name} className="h-12 w-12 text-lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-50">{name}</h2>
          {meta && <p className="truncate text-xs text-neutral-500">{meta}</p>}
        </div>

        <div className="relative shrink-0" ref={ref}>
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-neutral-600 hover:bg-(--ledger-surface)"
          >
            <Ellipsis size={18} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-(--ledger-line) bg-(--ledger-card) py-1 shadow-lg"
            >
              <button role="menuitem" className={item} onClick={() => { setMenuOpen(false); onEdit(); }}>
                Edit {cfg.noun}
              </button>
              <button role="menuitem" className={item} disabled={statementBusy} onClick={() => { setMenuOpen(false); onDownloadStatement(); }}>
                Download statement (PDF)
              </button>
              <button role="menuitem" className={item} disabled={statementBusy} onClick={() => { setMenuOpen(false); onShareStatement(); }}>
                Share statement on WhatsApp
              </button>
              <div className="my-1 border-t border-(--ledger-line)" />
              <button role="menuitem" className={cn(item, "text-(--receivable)")} onClick={() => { setMenuOpen(false); onDelete(); }}>
                Delete {cfg.noun}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Net balance</p>
          <p className="mt-0.5 flex items-center gap-2">
            <span className={cn("text-3xl font-bold tabular-nums tracking-tight", tone)}>{formatInr(netBalance)}</span>
            <BalancePill net={netBalance} kind={kind} className="text-xs" />
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {status}
            {owes ? ` · ${cfg.net.positiveHint}` : advance ? ` · ${cfg.net.negativeHint}` : " · nothing pending"}
            {lastEntryDate ? ` · last entry ${formatLedgerDate(lastEntryDate)}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {kind === "supplier" && (
            <button type="button" onClick={onAddContract} className={iconBtn} aria-label="Add lorry hire contract">
              <FilePlus size={15} aria-hidden="true" /> Contract
            </button>
          )}
          {kind === "supplier" && owes && (
            <button type="button" onClick={onPayNow} className={iconBtn} aria-label="Record a payment to this supplier">
              <Banknote size={15} aria-hidden="true" /> Pay now
            </button>
          )}
          {kind === "customer" && owes && (
            <button type="button" onClick={onSendReminder} className={iconBtn} aria-label="Send payment reminder on WhatsApp">
              <BellRing size={15} aria-hidden="true" /> Remind
            </button>
          )}
          <button type="button" onClick={onDownloadStatement} disabled={statementBusy} className={iconBtn} aria-label="Download statement PDF">
            <Download size={15} aria-hidden="true" /> Statement
          </button>
          <button type="button" onClick={onShareStatement} disabled={statementBusy} className={iconBtn} aria-label="Share statement on WhatsApp">
            <MessageCircle size={15} aria-hidden="true" /> Share
          </button>
          {mobile && (
            <a href={`tel:${mobile.replace(/[^\d+]/g, "")}`} className={iconBtn} aria-label={`Call ${name}`}>
              <Phone size={15} aria-hidden="true" /> Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
