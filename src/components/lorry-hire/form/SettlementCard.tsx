"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { amountInWords } from "@/lib/bill/validations";
import { summarizeLorryHireForm, type LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: "add" | "less"; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1 text-body-sm", strong && "font-semibold text-neutral-900")}>
      <span className="text-neutral-600">{label}</span>
      <span className={cn("tabular-nums", tone === "less" && "text-error-700", tone === "add" && "text-success-700")}>{value}</span>
    </div>
  );
}

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

/**
 * Live settlement waterfall. `paidSoFar` overrides the form's own payments —
 * once a contract exists its payments live on the server, not in the form.
 */
export function SettlementCard({ paidSoFar }: { paidSoFar?: number }) {
  const { v, s } = useLorryHireSummary(paidSoFar);

  const overCapacity =
    (v.truck?.capacity ?? 0) > 0 &&
    s.cargo.chargedWeight > 0 &&
    (v.truck?.capacityUnit ?? "MTS") === (v.weightUnit ?? "MTS") &&
    s.cargo.chargedWeight > (v.truck?.capacity ?? 0);

  return (
    <aside className="border border-neutral-200 bg-white">
      <header className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">Settlement</h2>
      </header>
      <div className="px-4 py-3">
        <Row label="Basic freight" value={inr(s.basicFreight)} />
        {s.additions > 0 && <Row label="+ Halting / extra" value={inr(s.additions)} tone="add" />}
        {s.deductions > 0 && <Row label="− Commission etc." value={inr(s.deductions)} tone="less" />}
        <Row label="Gross hire" value={inr(s.grossHire)} strong />
        {s.gstAmount > 0 && (
          <Row
            label={s.gstMode === "RCM" ? `RCM ${s.gstRate}% (we owe — not added)` : `GST ${s.gstRate}%`}
            value={inr(s.gstAmount)}
            tone={s.gstMode === "GST" ? "add" : undefined}
          />
        )}
        {s.tdsAmount > 0 && <Row label={`TDS ${v.tax?.tdsRate ?? 0}%`} value={`${s.tdsSigned < 0 ? "−" : "+"}${inr(s.tdsAmount)}`} tone={s.tdsSigned < 0 ? "less" : "add"} />}
        {s.shortage > 0 && <Row label="Shortage" value={`−${inr(s.shortage)}`} tone="less" />}
        {s.roundOffAmount !== 0 && <Row label="Round off" value={inr(s.roundOffAmount)} />}

        <div className="mt-2 border-t border-neutral-200 pt-2">
          <Row label="Net payable" value={inr(s.netPayable)} strong />
          <p className="pb-1 text-caption text-neutral-500">{amountInWords(s.netPayable)}</p>
          <Row label="Paid" value={inr(s.totalPaid)} tone="add" />
        </div>

        <div className="mt-2 flex items-baseline justify-between bg-neutral-50 px-3 py-2.5">
          <span className="text-body-sm font-semibold text-neutral-800">Balance</span>
          <span className={cn("text-lg font-bold tabular-nums", s.balance > 0 ? "text-error-700" : "text-success-700")}>
            {inr(s.balance)}
          </span>
        </div>

        {s.overpaid > 0 && (
          <p className="mt-2 text-caption text-error-700">Payments exceed the net payable by {inr(s.overpaid)}.</p>
        )}
        {overCapacity && (
          <p className="mt-2 text-caption text-warning-700">
            Charged weight ({s.cargo.chargedWeight} {v.weightUnit}) is above the truck capacity ({v.truck?.capacity} {v.truck?.capacityUnit}).
          </p>
        )}
        {s.cargo.packages > 0 && (
          <p className="mt-2 text-caption text-neutral-500">
            {s.cargo.packages} packages · {s.cargo.chargedWeight || s.cargo.actualWeight} {v.weightUnit}
          </p>
        )}
      </div>
    </aside>
  );
}
