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

function Item({ label, value, tone }: { label: string; value: string; tone?: "add" | "less" }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-neutral-500">{label}</p>
      <p className={cn("text-body-md font-medium tabular-nums text-neutral-900", tone === "add" && "text-success-700", tone === "less" && "text-error-700")}>
        {value}
      </p>
    </div>
  );
}

/**
 * Settlement summary at the top of the form: the breakdown, then the three
 * totals. Plain and flat like the rest of the app. `paidSoFar` overrides the
 * form's own payments — once a contract exists its payments live on the
 * server, not in the form.
 */
export function SettlementCard({ paidSoFar }: { paidSoFar?: number }) {
  const { v, s } = useLorryHireSummary(paidSoFar);

  const overCapacity =
    (v.truck?.capacity ?? 0) > 0 &&
    s.cargo.chargedWeight > 0 &&
    (v.truck?.capacityUnit ?? "MTS") === (v.weightUnit ?? "MTS") &&
    s.cargo.chargedWeight > (v.truck?.capacity ?? 0);

  return (
    <section aria-label="Settlement" className="border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 px-4 py-2">
        <h2 className="text-sm font-semibold text-neutral-900">Settlement</h2>
        {s.cargo.packages > 0 && (
          <span className="text-caption text-neutral-500">
            {s.cargo.packages} packages · {s.cargo.chargedWeight || s.cargo.actualWeight} {v.weightUnit}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-10 gap-y-3 px-4 py-3">
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
          <Item
            label={`TDS ${v.tax?.tdsRate ?? 0}%`}
            value={`${s.tdsSigned < 0 ? "−" : "+"} ${inr(s.tdsAmount)}`}
            tone={s.tdsSigned < 0 ? "less" : "add"}
          />
        )}
        {s.shortage > 0 && <Item label="Shortage" value={`− ${inr(s.shortage)}`} tone="less" />}
        {s.roundOffAmount !== 0 && <Item label="Round off" value={inr(s.roundOffAmount)} />}
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3">
        <div>
          <p className="text-caption text-neutral-500">Net payable</p>
          <p className="text-lg font-semibold tabular-nums text-neutral-900">{inr(s.netPayable)}</p>
        </div>
        <div>
          <p className="text-caption text-neutral-500">Paid</p>
          <p className="text-lg font-semibold tabular-nums text-neutral-900">{inr(s.totalPaid)}</p>
        </div>
        <div>
          <p className="text-caption text-neutral-500">Balance</p>
          <p className={cn("text-lg font-semibold tabular-nums", s.balance > 0 ? "text-error-700" : "text-success-700")}>{inr(s.balance)}</p>
        </div>
        <p className="text-caption text-neutral-500 sm:ml-auto">{amountInWords(s.netPayable)}</p>
      </div>

      {(s.overpaid > 0 || overCapacity) && (
        <div className="space-y-0.5 border-t border-neutral-200 px-4 py-2 text-caption text-error-700">
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