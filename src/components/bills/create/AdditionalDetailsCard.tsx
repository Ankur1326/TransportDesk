"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import type { FreightBillFormValues } from "@/lib/bill/validations";
import { SectionCard } from "@/components/bills/create/ui";

/** HSN code, vehicle, remarks and the bank details printed on this bill (prefilled from Settings). */
export function AdditionalDetailsCard() {
  const { register } = useFormContext<FreightBillFormValues>();

  return (
    <SectionCard title="Additional Details">
      <div className="grid gap-3">
        <Input size="compact" label="HSN / SAC code" hi="एचएसएन कोड" placeholder="e.g. 996511" {...register("hsnCode")} />
        <Input size="compact" label="Vehicle number" hi="गाड़ी नंबर" className="uppercase" {...register("vehicleNumber")} />
        <Input size="compact" label="Remarks" hi="टिप्पणी" {...register("remark")} />

        <div className="mt-1 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Bank details on bill</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input size="compact" label="Account holder name" hi="खाताधारक का नाम" {...register("bankDetails.accountHolderName")} />
            </div>
            <Input size="compact" label="Bank name" hi="बैंक का नाम" {...register("bankDetails.bankName")} />
            <Input size="compact" label="Account number" hi="खाता संख्या" inputMode="numeric" {...register("bankDetails.accountNumber")} />
            <div className="sm:col-span-2">
              <Input size="compact" label="Bank IFSC code" hi="आईएफएससी कोड" className="uppercase" {...register("bankDetails.ifscCode")} />
            </div>
          </div>
          <p className="mt-2 text-xs text-red-600">
            * Saved bank details from Settings are filled in automatically. Change them here for this bill only.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
