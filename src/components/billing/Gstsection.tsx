"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { computeBillingTotals } from "@/lib/calculations/billing";
import { formatINR } from "@/lib/numberToWords";
import type { BillingFormValues } from "@/lib/validations/billing";

const GST_TYPE_OPTIONS = [
  { value: "IGST", label: "IGST" },
  { value: "CGST_SGST", label: "CGST + SGST" },
  { value: "NONE", label: "No GST" },
];

const GST_PERCENTAGE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "custom", label: "Custom" },
];

export function GstSection() {
  const { register, control, watch } = useFormContext<BillingFormValues>();
  const charges = useWatch({ control, name: "charges" });
  const tax = useWatch({ control, name: "tax" });
  const gstType = watch("tax.type");
  const gstPercentage = watch("tax.percentage");

  const totals = computeBillingTotals(charges, tax);

  return (
    <FormSection title="GST" description="Tax is calculated automatically from the charges above.">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Select size="compact" label="GST Type" hi="जीएसटी का प्रकार" options={GST_TYPE_OPTIONS} {...register("tax.type")} />
        <Controller
          control={control}
          name="tax.percentage"
          render={({ field }) => (
            <Select
              size="compact"
              label="GST Percentage" hi="जीएसटी प्रतिशत"
              options={GST_PERCENTAGE_OPTIONS}
              disabled={gstType === "NONE"}
              value={String(field.value)}
              onChange={(e) => field.onChange(e.target.value === "custom" ? "custom" : Number(e.target.value))}
            />
          )}
        />
        {gstPercentage === "custom" && gstType !== "NONE" && (
          <Input size="compact" type="number" min={0} max={100} step="0.01" label="Custom GST %" hi="कस्टम जीएसटी %" {...register("tax.customPercentage")} />
        )}
      </div>

      {gstType !== "NONE" && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-neutral-50 p-2 sm:grid-cols-3">
          {gstType === "CGST_SGST" ? (
            <>
              <div>
                <p className="text-[10px] text-neutral-500">CGST</p>
                <p className="text-[11px] font-semibold text-neutral-900">{formatINR(totals.cgstAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500">SGST</p>
                <p className="text-[11px] font-semibold text-neutral-900">{formatINR(totals.sgstAmount)}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-[10px] text-neutral-500">IGST</p>
              <p className="text-[11px] font-semibold text-neutral-900">{formatINR(totals.igstAmount)}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-neutral-500">Total GST Amount</p>
            <p className="text-[11px] font-semibold text-brand-700">{formatINR(totals.gstAmount)}</p>
          </div>
        </div>
      )}
    </FormSection>
  );
}