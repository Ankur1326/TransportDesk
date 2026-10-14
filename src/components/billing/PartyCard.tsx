"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { UserPlus } from "@/components/icons";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import type { AppDispatch, RootState } from "@/redux/store";
import { fetchConsigners } from "@/redux/slices/consignerSlice";
import { fetchConsignees } from "@/redux/slices/consigneeSlice";
import { GST_STATES } from "@/data/gstStates";
import type { BillingFormValues } from "@/lib/validations/billing";

interface PartyCardProps {
  prefix: "consignor" | "consignee";
  title: string;
  description: string;
}

/**
 * State is stored as "24-GUJARAT" (code-name, see StateAutocomplete).
 * This builds extra, invisible search text so a user can find the same
 * record by typing the state code ("GJ"), the GST code ("24"), or the
 * plain name ("gujarat") — not just what's already shown on screen.
 */
function stateSearchKeywords(state?: string): string {
  if (!state) return "";
  const code = state.split("-")[0]?.trim();
  const match = GST_STATES.find((s) => s.code === code);
  return match ? `${state} ${match.stateCode} ${match.name}` : state;
}

export function PartyCard({ prefix, title, description }: PartyCardProps) {
  const {
    register,
    setValue,
    resetField,
    formState: { errors },
  } = useFormContext<BillingFormValues>();
  const sectionErrors = errors[prefix];

  const dispatch = useDispatch<AppDispatch>();
  const isConsignor = prefix === "consignor";

  // Consignor and consignee are backed by separate collections/slices —
  // pick the right one for this card.
  const { consigners, status: consignersStatus } = useSelector((state: RootState) => state.consigners);
  const { consignees, status: consigneesStatus } = useSelector((state: RootState) => state.consignees);

  const customers = isConsignor ? consigners : consignees;
  const status = isConsignor ? consignersStatus : consigneesStatus;

  // Load the full customer list once (large itemsPerPage) so search is
  // instant client-side as the user types, instead of a round trip per
  // keystroke. Guarded by status so consignor + consignee cards on the same
  // page don't refetch each other's data or refetch on every re-render.
  useEffect(() => {
    if (status !== "idle") return;
    if (isConsignor) {
      dispatch(fetchConsigners({ itemsPerPage: 1000, currentPage: 1 }));
    } else {
      dispatch(fetchConsignees({ itemsPerPage: 1000, currentPage: 1 }));
    }
  }, [dispatch, isConsignor, status]);

  const handleAddNew = () => {
    resetField(`${prefix}.customerId`, { defaultValue: "" });
    resetField(`${prefix}.name`, { defaultValue: "" });
    resetField(`${prefix}.address`, { defaultValue: "" });
    resetField(`${prefix}.city`, { defaultValue: "" });
    resetField(`${prefix}.state`, { defaultValue: "" });
    resetField(`${prefix}.pincode`, { defaultValue: "" });
    resetField(`${prefix}.gstin`, { defaultValue: "" });
    resetField(`${prefix}.mobile`, { defaultValue: "" });
    resetField(`${prefix}.email`, { defaultValue: "" });
  };

  return (
    <FormSection title={title} description={description}>
      <div className="space-y-3">
        <Combobox
          size="compact"
          label="Select existing customer"
          placeholder="Search customer…"
          items={customers.map((c) => ({
            id: c._id,
            label: c.name,
            subLabel: `${c.city}, ${c.state}`,
            keywords: stateSearchKeywords(c.state),
          }))}
          onSelect={(item) => {
            const customer = customers.find((c) => c._id === item.id);
            if (!customer) return;
            setValue(`${prefix}.customerId`, customer._id);
            setValue(`${prefix}.name`, customer.name, { shouldValidate: true });
            setValue(`${prefix}.address`, customer.address, { shouldValidate: true });
            setValue(`${prefix}.city`, customer.city);
            setValue(`${prefix}.state`, customer.state);
            setValue(`${prefix}.pincode`, customer.pincode);
            setValue(`${prefix}.gstin`, customer.gstin);
            setValue(`${prefix}.mobile`, customer.mobile, { shouldValidate: true });
            setValue(`${prefix}.email`, customer.email);
          }}
          onCreateNew={handleAddNew}
          createNewLabel="+ Add New Customer"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" label="Company / Customer Name" required error={sectionErrors?.name?.message} {...register(`${prefix}.name`)} />
          <Input size="compact" label="Address" required error={sectionErrors?.address?.message} {...register(`${prefix}.address`)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" required label="City" error={sectionErrors?.city?.message} {...register(`${prefix}.city`)} />
          <Input size="compact" required label="State" error={sectionErrors?.state?.message} {...register(`${prefix}.state`)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" label="PIN Code" error={sectionErrors?.pincode?.message} {...register(`${prefix}.pincode`)} />
          <Input size="compact" required label="GSTIN" error={sectionErrors?.gstin?.message} {...register(`${prefix}.gstin`)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" label="Mobile Number" error={sectionErrors?.mobile?.message} {...register(`${prefix}.mobile`)} />
          <Input size="compact" type="email" label="Email" error={sectionErrors?.email?.message} {...register(`${prefix}.email`)} />
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="focus-ring inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800"
        >
          <UserPlus className="h-3 w-3" aria-hidden="true" />
          Add as new customer
        </button>
      </div>
    </FormSection>
  );
}