"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PACKING_TYPES } from "@/lib/validations/billing";
import type { BillingFormValues } from "@/lib/validations/billing";

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export function ShipmentDetailsSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<BillingFormValues>();
  const shipmentErrors = errors.shipment;

  return (
    <FormSection title="Shipment Details" description="What's being shipped, how it's packed, and its declared value.">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Input
            size="compact"
            label="Packages" hi="पैकेज / नग"
            error={shipmentErrors?.packages?.message}
            {...register("shipment.packages")}
          />
          <Select
            size="compact"
            label="Packing" hi="पैकिंग"
            options={toOptions(PACKING_TYPES)}
            error={shipmentErrors?.packing?.message}
            {...register("shipment.packing")}
          />
          <Input
            size="compact"
            label="Classification / Product Code" hi="वर्गीकरण / उत्पाद कोड"
            error={shipmentErrors?.classification?.message}
            {...register("shipment.classification")}
          />
          <Input
            size="compact"
            label="Declared Value (₹)" hi="घोषित मूल्य"
            error={shipmentErrors?.declaredValue?.message}
            {...register("shipment.declaredValue")}
          />
          <Input size="compact" label="Invoice Number" hi="इनवॉइस नंबर" error={errors.invoiceNumber?.message} {...register("invoiceNumber")} />

          <Input size="compact" type="date" label="Invoice Date" hi="इनवॉइस की तारीख" error={errors.invoiceDate?.message} {...register("invoiceDate")} />
          <Input
            size="compact"
            label="Volume LxBXH = CFT" hi="आयतन"
            error={shipmentErrors?.volume?.message}
            {...register("shipment.volume")}
          />
          <Input
            size="compact"
            label="Actual Weight" hi="वास्तविक वजन"
            error={shipmentErrors?.actualWeight?.message}
            {...register("shipment.actualWeight")}
          />

          <Input
            size="compact"
            label="Charged Wt. as agreed" hi="तय चार्ज वजन"
            error={shipmentErrors?.chargeWeight?.message}
            {...register("shipment.chargeWeight")}
          />
          <Input
            size="compact"
            type="date"
            label="Acknowledgement Date" hi="पावती की तारीख"
            error={errors.bookingDate?.message}
            {...register("bookingDate")}
          />
          <Input
            size="compact"
            type="date"
            label="Expected Delivery Date" hi="अनुमानित डिलीवरी तिथि"
            {...register("vehicle.expectedDeliveryDate")}
          />
          <Textarea
            size="compact"
            rows={3}
            className="col-span-full w-full"
            label="Description of Goods" hi="माल का विवरण"
            placeholder="e.g. Activated Carbon"
            error={shipmentErrors?.description?.message}
            {...register("shipment.description")}
          />
        </div>

      </div>
    </FormSection>
  );
}