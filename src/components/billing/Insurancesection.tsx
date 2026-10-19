"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { BillingFormValues } from "@/lib/validations/billing";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-brand-700" : "bg-neutral-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-4.5" : "translate-x-1"
        )}
      />
    </button>
  );
}

export function InsuranceSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<BillingFormValues>();
  const insuranceErrors = errors.insurance;
  const required = useWatch({ control, name: "insurance.required" });

  return (
    <FormSection
      title="Insurance"
      description="Optional — enable if this consignment is covered by insurance."
      headerAction={
        <Controller
          control={control}
          name="insurance.required"
          render={({ field }) => (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-600">{field.value ? "Required" : "Not required"}</span>
              <Toggle checked={field.value} onChange={field.onChange} />
            </div>
          )}
        />
      }
    >
      {required && (
        <div className="grid grid-cols-2 gap-1.5">
          <Input size="compact" label="Insurance Company" hi="बीमा कंपनी" error={insuranceErrors?.company?.message} {...register("insurance.company")} />
          <Input size="compact" label="Policy Number" hi="पॉलिसी नंबर" error={insuranceErrors?.policyNumber?.message} {...register("insurance.policyNumber")} />
          <Input
            size="compact"
            type="number"
            min={0}
            label="Insurance Amount (₹)" hi="बीमा राशि"
            error={insuranceErrors?.amount?.message}
            {...register("insurance.amount")}
          />
          <Input size="compact" type="date" label="Insurance Date" hi="बीमा की तारीख" error={insuranceErrors?.date?.message} {...register("insurance.date")} />
          <Input size="compact" label="Risk Type" hi="जोखिम का प्रकार" error={insuranceErrors?.riskType?.message} {...register("insurance.riskType")} />
        </div>
      )}
    </FormSection>
  );
}