"use client";

import { Controller, useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { cn } from "@/lib/utils";
import { LOAD_TYPES, SEGMENTS } from "@/lib/validations/billing";
import type { BillingFormValues } from "@/lib/validations/billing";

function PillGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={cn(
              "focus-ring rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-brand-400 hover:bg-brand-50"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function LoadTypeSection() {
  const { control } = useFormContext<BillingFormValues>();

  return (
    <FormSection title="Segment & Load Type" description="Classifies how this shipment is billed and moved.">
      <div className="space-y-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.02em] text-neutral-600">Segment
            <span className="ml-1 text-[11px] font-medium normal-case tracking-normal text-neutral-500">(श्रेणी)</span>
          </p>
          <Controller
            control={control}
            name="segment"
            render={({ field }) => <PillGroup value={field.value} options={SEGMENTS} onChange={field.onChange} />}
          />
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.02em] text-neutral-600">Load Type
            <span className="ml-1 text-[11px] font-medium normal-case tracking-normal text-neutral-500">(लोड का प्रकार)</span>
          </p>
          <Controller
            control={control}
            name="loadType"
            render={({ field }) => <PillGroup value={field.value} options={LOAD_TYPES} onChange={field.onChange} />}
          />
        </div>
      </div>
    </FormSection>
  );
}