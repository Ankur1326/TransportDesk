"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Select } from "@/components/ui/Select";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { BILLING_PARTIES, PAYMENT_STATUSES, PAYMENT_TYPES, RECEIVED_TYPES } from "@/lib/validations/billing";
import type { BillingFormValues } from "@/lib/validations/billing";

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export function PaymentSection() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<BillingFormValues>();
  const paymentErrors = errors.payment;
  const billingAccount = watch("payment.billingAccount");
  const paymentStatus = watch("payment.status");
  const showReceivedFields = paymentStatus === "Paid" || paymentStatus === "Partially Paid";
  const receivedType = watch("payment.receivedType");

  return (
    <FormSection title="Payment / Billing Information" description="How and by whom this consignment will be paid.">
      <div className="grid grid-cols-2 gap-1.5">
        <Select
          size="compact"
          label="Payment Type" hi="भुगतान का प्रकार"
          // required
          placeholder="Select payment type"
          options={toOptions(PAYMENT_TYPES)}
          error={paymentErrors?.type?.message}
          {...register("payment.type")}
        />
        <Select
          size="compact"
          label="Billing Party" hi="बिलिंग पार्टी"
          options={toOptions(BILLING_PARTIES)}
          error={paymentErrors?.billingParty?.message}
          {...register("payment.billingParty")}
        />

        {/* <div className="col-span-2">
          <Combobox
            size="compact"
            label="Billing Account"
            placeholder="Search customer to bill…"
            items={MOCK_CUSTOMERS.map((c) => ({ id: c.id, label: c.name, subLabel: `${c.city}, ${c.state}` }))}
            onSelect={(item) => setValue("payment.billingAccount", item.label)}
          />
          {billingAccount && (
            <Input size="compact" readOnly value={billingAccount} className="mt-1 bg-neutral-50 text-neutral-600" />
          )}
        </div> */}

        <Select
          size="compact"
          label="Payment Status" hi="भुगतान की स्थिति"
          options={toOptions(PAYMENT_STATUSES)}
          error={paymentErrors?.status?.message}
          {...register("payment.status")}
        />

        {showReceivedFields && (
          <>
            <Select
              size="compact"
              label="Received Type" hi="प्राप्ति का प्रकार"
              options={toOptions(RECEIVED_TYPES)}
              {...register("payment.receivedType")}
            />
            {
              receivedType == "NEFT" &&
              <Input
                size="compact"
                type="text"
                label="UTR Number" hi="यूटीआर नंबर"
                {...register("payment.UTRNumber")}
              />
            }
            <Input
              size="compact"
              type="text"
              label="Received Money" hi="प्राप्त राशि"
              {...register("payment.receivedMoney")}
            />
            <Input
              size="compact"
              type="Date"
              label="Received Date" hi="प्राप्ति की तारीख"
              {...register("payment.receivedDate")}
            />

            <Input
              size="compact"
              type="text"
              label="MR. No." hi="एमआर नंबर"
              {...register("payment.mrNumber")}
            />
            <Input
              size="compact"
              type="Date"
              label="MR. Date" hi="एमआर की तारीख"
              {...register("payment.mrDate")}
            />

          </>
        )}

      </div>
    </FormSection>
  );
}