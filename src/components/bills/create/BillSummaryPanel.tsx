"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ChevronUp } from "@/components/icons";
import {
  ADVANCE_MODES,
  GST_RATE_OPTIONS,
  RCM_RATE,
  TDS_RATE_OPTIONS,
  computeBillSummary,
  computeBillTotals,
  type FreightBillFormValues,
} from "@/lib/bill/validations";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SectionCard, inr } from "@/components/bills/create/ui";

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "muted" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className={cn("text-slate-600", tone === "muted" && "text-slate-400")}>{label}</span>
      <span className={cn("font-semibold tabular-nums text-slate-900", tone === "green" && "text-success-700", tone === "red" && "text-error-600")}>
        {value}
      </span>
    </div>
  );
}

function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="focus-ring mt-2 flex items-center gap-1.5 rounded text-xs font-semibold text-brand-700 hover:text-brand-800"
    >
      {children}
      <ChevronUp className={cn("h-3.5 w-3.5 transition-transform", !open && "rotate-180")} aria-hidden="true" />
    </button>
  );
}

function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("focus-ring py-2", value === o.id ? "bg-brand-700 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Right-hand money panel: trip total, discount, GST / RCM, TDS, round-off, advance and payable amount. */
export function BillSummaryPanel() {
  const { control, register, setValue } = useFormContext<FreightBillFormValues>();
  const items = useWatch({ control, name: "items" }) ?? [];
  const adj = useWatch({ control, name: "adjustments" });

  const trip = computeBillTotals(items).totalCharges;
  const s = computeBillSummary(trip, adj);

  const [showDiscount, setShowDiscount] = useState(Boolean(adj?.discount));
  const [showGst, setShowGst] = useState(Boolean(adj && adj.gstMode !== "None"));
  const [showTds, setShowTds] = useState(Boolean(adj?.tdsRate));
  const [showAdvance, setShowAdvance] = useState(Boolean(adj?.advanceReceived));

  const gstTab = adj?.gstMode === "RCM" ? "RCM" : "GST";
  const set = <K extends keyof NonNullable<FreightBillFormValues["adjustments"]>>(key: K, value: NonNullable<FreightBillFormValues["adjustments"]>[K]) =>
    setValue(`adjustments.${key}` as never, value as never, { shouldDirty: true });

  return (
    <SectionCard>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-success-700">Total Trip Amount</span>
        <span className="text-lg font-bold tabular-nums text-success-700">{inr(s.trip)}</span>
      </div>

      {/* Discount */}
      <Toggle open={showDiscount} onClick={() => setShowDiscount((v) => !v)}>+ Add Discount</Toggle>
      {showDiscount && (
        <div className="mt-2">
          <Input size="compact" type="number" min={0} step="0.01" label="Discount amount (₹)" hi="छूट राशि" {...register("adjustments.discount")} />
        </div>
      )}

      {/* GST */}
      <Toggle open={showGst} onClick={() => setShowGst((v) => !v)}>+ Add GST Details</Toggle>
      {showGst && (
        <div className="mt-2">
          <Tabs
            value={gstTab}
            onChange={(v) => set("gstMode", v === "RCM" ? "RCM" : (adj?.gstRate ?? 0) > 0 ? "GST" : "None")}
            options={[
              { id: "GST", label: "GST Applied" },
              { id: "RCM", label: `RCM Applied (${RCM_RATE}%)` },
            ]}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            {gstTab === "GST" ? (
              <div className="w-52">
                <Select
                  size="compact"
                  label="GST rate"
                  hi="जीएसटी दर"
                  value={String(adj?.gstRate ?? 0)}
                  onChange={(e) => {
                    const rate = Number(e.target.value);
                    set("gstRate", rate);
                    set("gstMode", rate > 0 ? "GST" : "None");
                  }}
                  options={GST_RATE_OPTIONS.map((r) => ({ value: String(r), label: r === 0 ? "Nil (no GST)" : `GST ${r}%` }))}
                />
              </div>
            ) : (
              <span className="text-xs text-slate-500">GST is paid by the recipient (reverse charge) — shown, not added.</span>
            )}
            <span className="text-xs font-semibold text-success-700">GST Amount : {inr(s.gstAmount)}</span>
          </div>
        </div>
      )}

      {/* TDS */}
      <Toggle open={showTds} onClick={() => setShowTds((v) => !v)}>{`+ Add TDS Details (${s.tdsSigned < 0 ? "-" : s.tdsSigned > 0 ? "+" : " "})`}</Toggle>
      {showTds && (
        <div className="mt-2">
          <Tabs
            value={adj?.tdsMode ?? "Deduction"}
            onChange={(v) => set("tdsMode", v)}
            options={[
              { id: "Deduction", label: "TDS Deduction" },
              { id: "Addition", label: "TDS Addition" },
            ]}
          />
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="w-40">
              <Select
                size="compact"
                label="TDS rate"
                hi="टीडीएस दर"
                value={String(adj?.tdsRate ?? 0)}
                onChange={(e) => set("tdsRate", Number(e.target.value))}
                options={TDS_RATE_OPTIONS.map((r) => ({ value: String(r), label: `${r}%` }))}
              />
            </div>
            <span className="text-xs font-semibold text-error-600">TDS Amount : {inr(s.tdsAmount)}</span>
          </div>
        </div>
      )}

      <label className="mt-3 flex cursor-pointer items-center justify-end gap-2 text-xs font-semibold text-brand-700">
        <input
          type="checkbox"
          checked={Boolean(adj?.roundOff)}
          onChange={(e) => set("roundOff", e.target.checked)}
          className="focus-ring h-4 w-4 accent-brand-700"
        />
        Round Off
      </label>

      <div className="mt-3 border-t border-slate-200 pt-3">
        {s.discount > 0 && <Row label="Discount" value={`- ${inr(s.discount)}`} tone="red" />}
        {s.gstAdded > 0 && <Row label={`GST (${s.gstRate}%)`} value={`+ ${inr(s.gstAdded)}`} />}
        {s.tdsAmount > 0 && <Row label={`TDS ${s.tdsSigned < 0 ? "deducted" : "added"}`} value={`${s.tdsSigned < 0 ? "-" : "+"} ${inr(s.tdsAmount)}`} tone={s.tdsSigned < 0 ? "red" : undefined} />}
        {s.roundOffAmount !== 0 && <Row label="Round off" value={`${s.roundOffAmount > 0 ? "+" : "-"} ${inr(Math.abs(s.roundOffAmount))}`} tone="muted" />}
        <Row label="Invoice Amount" value={inr(s.invoiceAmount)} tone="green" />
      </div>

      {/* Advance */}
      <Toggle open={showAdvance} onClick={() => setShowAdvance((v) => !v)}>+ Advance Received</Toggle>
      {showAdvance && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Input size="compact" type="number" min={0} step="0.01" label="Advance received (₹)" hi="अग्रिम प्राप्त" {...register("adjustments.advanceReceived")} />
          <Input size="compact" type="date" label="Advance paid date" hi="अग्रिम भुगतान तिथि" {...register("adjustments.advanceDate")} />
          <div className="sm:col-span-2">
            <Select
              size="compact"
              label="Received via"
              hi="प्राप्त माध्यम"
              options={ADVANCE_MODES.map((m) => ({ value: m, label: m }))}
              {...register("adjustments.advanceVia")}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5">
        <span className="text-sm font-semibold text-brand-900">Payable Amount</span>
        <span className="text-lg font-bold tabular-nums text-brand-900">{inr(s.payable)}</span>
      </div>
    </SectionCard>
  );
}
