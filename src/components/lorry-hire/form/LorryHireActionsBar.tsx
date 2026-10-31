"use client";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Eye, Printer, Save } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLorryHireSummary } from "./SettlementCard";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Sticky bottom bar — same place and shape as the consignment form's actions. */
export function LorryHireActionsBar({
  mode,
  busy,
  canSave,
  paid,
  onPreview,
  onSave,
  onSaveAndPrint,
  onPrintSaved,
}: {
  mode: "create" | "edit";
  busy: boolean;
  /** False for a cancelled contract: it can be previewed and printed, not saved. */
  canSave: boolean;
  /** Already-paid total (edit mode); the form's own payments are used when omitted. */
  paid?: number;
  onPreview: () => void;
  onSave: () => void;
  onSaveAndPrint: () => void;
  /** Cancelled contracts: print the stored version as-is. */
  onPrintSaved: () => void;
}) {
  const { s } = useLorryHireSummary(paid);
  const net = s.netPayable;
  const balance = s.balance;
  return (
    <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-body-sm lg:hidden">
          <span className="text-neutral-500">Net {inr(net)}</span>
          <span className={cn("ml-3 font-semibold tabular-nums", balance > 0 ? "text-error-700" : "text-success-700")}>Balance {inr(balance)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Link href="/admin/lorry-hires">
            <Button type="button" variant="outline" size="sm">Cancel</Button>
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4" aria-hidden="true" /> Preview
          </Button>
          {canSave ? (
            <>
              <Button type="button" variant="outline" size="sm" isLoading={busy} onClick={onSave}>
                <Save className="h-4 w-4" aria-hidden="true" /> {mode === "edit" ? "Save changes" : "Create contract"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-[#ED7224] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95"
                isLoading={busy}
                onClick={onSaveAndPrint}
              >
                <Printer className="h-4 w-4" aria-hidden="true" /> Save &amp; Print
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={onPrintSaved}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Print
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
