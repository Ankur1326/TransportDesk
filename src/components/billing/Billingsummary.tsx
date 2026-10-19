"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { computeBillingTotals } from "@/lib/calculations/billing";
import { amountToWords, formatINR } from "@/lib/numberToWords";
import { cn } from "@/lib/utils";
import type { BillingFormValues } from "@/lib/validations/billing";

export function BillingSummary({ className }: { className?: string }) {
  const { control } = useFormContext<BillingFormValues>();
  const charges = useWatch({ control, name: "charges" });
  const tax = useWatch({ control, name: "tax" });

  const totals = computeBillingTotals(charges, tax);
  const nonZeroLines = totals.lineItems.filter((item) => item.amount > 0);

  return (
    <Card padding="sm" className={cn("rounded-xl border-brand-200 bg-brand-50/40 shadow-sm", className)}>
      <CardHeader className="mb-3">
        <CardTitle className="text-sm font-bold text-slate-900">
          Live billing summary
        </CardTitle>
      </CardHeader>

      {nonZeroLines.length === 0 ? (
        <p className="text-xs text-neutral-500">Enter charges to see the calculated total.</p>
      ) : (
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5">
          {nonZeroLines.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-[10.5px]">
              <dt className="text-neutral-500">{item.label}:</dt>
              <dd key={item.amount} className="uts-pop font-medium text-neutral-900">{formatINR(item.amount)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="my-3 h-px bg-neutral-200" />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-neutral-500">Subtotal:</span>
          <span className="font-medium text-neutral-900">{formatINR(totals.subtotal)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-neutral-500">GST ({totals.gstPercentage}%):</span>
          <span className="font-medium text-neutral-900">{formatINR(totals.gstAmount)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-900">Grand Total</span>
          <span key={totals.grandTotal} className="uts-pop inline-block text-lg font-bold text-brand-700">{formatINR(totals.grandTotal)}</span>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-snug text-neutral-600">
        <span className="font-semibold text-neutral-700">Amount in Words: </span>
        {amountToWords(totals.grandTotal)}
      </p>
    </Card>
  );
}