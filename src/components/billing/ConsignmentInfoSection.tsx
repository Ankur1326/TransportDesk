"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import type { BillingFormValues } from "@/lib/validations/billing";

export function ConsignmentInfoSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<BillingFormValues>();
  return (
    <FormSection title="LR details" description="Set the consignment number, date and supporting document references.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="sm:col-span-2 xl:col-span-1">
          <Input
            size="compact"
            label="Consignment No." hi="बिल्टी नंबर"
            required
            className="font-bold text-brand-800"
            error={errors.consignmentNumber?.message}
            {...register("consignmentNumber")}
          />
        </div>

        <Input size="compact" type="date" label="CNS Date" hi="बिल्टी की तारीख" error={errors.cnsDate?.message} {...register("cnsDate")} />

        <Input
          size="compact"
          label="Vehicle Number" hi="गाड़ी नंबर"
          placeholder="e.g. GJ 01 AB 1234"
          error={errors.vehicleNumber?.message}
          {...register("vehicleNumber")}
        />

        <Input
          size="compact"
          label="E-Way Bill Number" hi="ई-वे बिल नंबर"
          placeholder="Optional"
          error={errors.eWayBillNumber?.message}
          {...register("eWayBillNumber")}
        />

        <Input size="compact" type="datetime-local" label="Valid Up To" hi="वैधता तिथि तक" error={errors.validUpTo?.message} {...register("validUpTo")} />
      </div>
    </FormSection>
  );
}