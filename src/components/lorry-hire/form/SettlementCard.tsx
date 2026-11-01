"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { amountInWords } from "@/lib/bill/validations";
import { summarizeLorryHireForm, type LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Live settlement figures for the form. `paidSoFar` overrides the form's own payments (edit mode). */
export function useLorryHireSummary(paidSoFar?: number) {
  const { control } = useFormContext<LorryHireFormValues>();
  const v = useWatch({ control }) as LorryHireFormValues;
  const summary = summarizeLorryHireForm({
    freight: { rateMode: v.freight?.rateMode ?? "Fixed", rate: v.freight?.rate ?? 0, freightPaidBy: "Transporter" },
    weightUnit: v.weightUnit ?? "MTS",
    items: v.items ?? [],
    charges: v.charges ?? [],
    tax: v.tax,
    shortage: v.shortage,
    payments: paidSoFar === undefined ? v.payments ?? [] : [{ amount: paidSoFar }],
  } as never);
  return { v, s: summary };
}

/** One label + value pair on a single line, e.g. "Basic freight ₹10,000.00". */
function Item({ label, value, tone }: { label: string; value: string; tone?: "add" | "less" }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-neutral-500">{label}</span>{" "}
      <span className={cn("font-medium tabular-nums text-neutral-900", tone === "add" && "text-success-700", tone === "less" && "text-error-700")}>{value}</span>
    </span>
  );
}

/**
 * Settlement summary at the top of the form, kept to two short rows: the
 * breakdown (only the lines that apply), then the three totals. `paidSoFar`
 * overrides the form's own payments — once a contract exists its payments live
 * on the server, not in the form.
 */
export function SettlementCard({ paidSoFar }: { paidSoFar?: number }) {
  const { v, s } = useLorryHireSummary(paidSoFar);

  const overCapacity =
    (v.truck?.capacity ?? 0) > 0 &&
    s.cargo.chargedWeight > 0 &&
    (v.truck?.capacityUnit ?? "MTS") === (v.weightUnit ?? "MTS") &&
    s.cargo.chargedWeight > (v.truck?.capacity ?? 0);

  return (
    <section aria-label="Settlement" className="border border-neutral-200 bg-white text-[12px]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500">Settlement</span>
        <Item label="Basic freight" value={inr(s.basicFreight)} />
        {s.additions > 0 && <Item label="Extra charges" value={`+ ${inr(s.additions)}`} tone="add" />}
        {s.deductions > 0 && <Item label="Deductions" value={`− ${inr(s.deductions)}`} tone="less" />}
        <Item label="Gross hire" value={inr(s.grossHire)} />
        {s.gstAmount > 0 && (
          <Item
            label={s.gstMode === "RCM" ? `GST ${s.gstRate}% (RCM, not added)` : `GST ${s.gstRate}%`}
            value={inr(s.gstAmount)}
            tone={s.gstMode === "GST" ? "add" : undefined}
          />
        )}
        {s.tdsAmount > 0 && (
          <Item label={`TDS ${v.tax?.tdsRate ?? 0}%`} value={`${s.tdsSigned < 0 ? "−" : "+"} ${inr(s.tdsAmount)}`} tone={s.tdsSigned < 0 ? "less" : "add"} />
        )}
        {s.shortage > 0 && <Item label="Shortage" value={`− ${inr(s.shortage)}`} tone="less" />}
        {s.roundOffAmount !== 0 && <Item label="Round off" value={inr(s.roundOffAmount)} />}
        {s.cargo.packages > 0 && (
          <span className="whitespace-nowrap text-neutral-500 sm:ml-auto">
            {s.cargo.packages} packages · {s.cargo.chargedWeight || s.cargo.actualWeight} {v.weightUnit}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <span className="whitespace-nowrap">
          <span className="text-neutral-500">Net payable</span> <b className="text-[15px] font-semibold tabular-nums text-neutral-900">{inr(s.netPayable)}</b>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-neutral-500">Paid</span> <b className="text-[15px] font-semibold tabular-nums text-neutral-900">{inr(s.totalPaid)}</b>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-neutral-500">Balance</span>{" "}
          <b className={cn("text-[15px] font-semibold tabular-nums", s.balance > 0 ? "text-error-700" : "text-success-700")}>{inr(s.balance)}</b>
        </span>
        <span className="min-w-0 text-[11px] text-neutral-500 sm:ml-auto sm:truncate">{amountInWords(s.netPayable)}</span>
      </div>

      {(s.overpaid > 0 || overCapacity) && (
        <div className="space-y-0.5 border-t border-neutral-200 px-3 py-1.5 text-[11px] text-error-700">
          {s.overpaid > 0 && <p>Payments exceed the net payable by {inr(s.overpaid)}.</p>}
          {overCapacity && (
            <p>
              Charged weight ({s.cargo.chargedWeight} {v.weightUnit}) is above the truck capacity ({v.truck?.capacity} {v.truck?.capacityUnit}).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
