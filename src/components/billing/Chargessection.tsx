"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/Button";
import type { BillingFormValues } from "@/lib/validations/billing";
import type { ChargeDefinition } from "@/lib/charges";

export function ChargesSection({ chargeDefinitions }: { chargeDefinitions: ChargeDefinition[] }) {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<BillingFormValues>();

  const printHidden = useWatch({ control, name: "charges.printHidden" });

  return (
    <FormSection title="Freight & Charges" description="All charge lines feed the billing summary automatically — no manual totals needed.">
      {/* Header action: toggle hide/show details (affects print output) */}
      <div className="absolute right-2 top-2 bg-gray-100 rounded-md">
        <Button
          variant={printHidden ? "outline" : "ghost"}
          size="sm"
          onClick={() => setValue("charges.printHidden", !printHidden)}
          type="button"
        >
          {printHidden ? "Show Details" : "Hide Details"}
        </Button>
      </div>

      <div className="mb-2">
        {printHidden && <div className="text-sm font-semibold">Freight: To be billed</div>}
      </div>

      <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4 ${printHidden ? 'blur-[1px] focus-within:blur-[0px]' : ''}`}>
        {chargeDefinitions.filter((charge) => charge.includeOnBilty).map((charge, index) => (
          <Input
            key={charge.id}
            size="compact"
            type="number"
            min={0}
            step="0.01"
            label={charge.name}
            startIcon={<span className="text-[11px]">₹</span>}
            error={errors.charges?.chargeLines?.[index]?.amount?.message}
            {...register(`charges.chargeLines.${index}.amount`)}
          />
        ))}
      </div>
    </FormSection>
  );
}