"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Textarea } from "@/components/ui/Textarea";
import type { BillingFormValues } from "@/lib/validations/billing";

export function AdditionalInfoSection() {
  const { register } = useFormContext<BillingFormValues>();

  return (
    <FormSection title="Additional Information">
      <div className="space-y-1.5">
        <Textarea
          size="compact"
          label="Internal Notes" hi="आंतरिक टिप्पणी"
          rows={2}
          helperText="Private — not shown on the customer's printed copy."
          {...register("internalNotes")}
        />
      </div>
    </FormSection>
  );
}