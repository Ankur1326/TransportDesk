"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import type { BillingFormValues } from "@/lib/validations/billing";

function RouteColumn({ prefix }: { prefix: "from" | "to" }) {
  const { register, formState: { errors } } = useFormContext<BillingFormValues>();
  const sectionErrors = errors[prefix];
  const label = prefix === "from" ? "Origin" : "Destination";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-800">
        <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
        {label}
      </h3>
      <div className="space-y-1.5">
        <Input size="compact" label="City / Location" hi="शहर / स्थान" placeholder={`Enter ${label.toLowerCase()} city`} error={sectionErrors?.location?.message} {...register(`${prefix}.location`)} />
        <Input size="compact" label="Branch / Office" hi="शाखा / कार्यालय" error={sectionErrors?.branch?.message} {...register(`${prefix}.branch`)} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input size="compact" label="State" hi="राज्य" error={sectionErrors?.state?.message} {...register(`${prefix}.state`)} />
          <Input size="compact" label="GSTIN" hi="जीएसटीआईएन" error={sectionErrors?.gstin?.message} {...register(`${prefix}.gstin`)} />
        </div>
      </div>
    </div>
  );
}

export function RouteSection() {
  return (
    <FormSection title="Shipment route" description="Where the goods are picked up and delivered.">
      <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
        <RouteColumn prefix="from" />
        <span className="hidden rounded-full bg-brand-50 p-2 text-brand-700 md:inline-flex" aria-label="to">
          →
        </span>
        <RouteColumn prefix="to" />
      </div>
    </FormSection>
  );
}