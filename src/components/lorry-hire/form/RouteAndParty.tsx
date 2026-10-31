"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Combobox, type ComboboxItem } from "@/components/ui/Combobox";
import StateAutocomplete from "@/components/StateAutocomplete";
import { LOAD_TYPES, SUPPLIER_TYPES } from "@/lib/lorry-hire/constants";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { CheckField, FieldGrid, FormBlock, NumField, SelectField, SubHeading, TextField } from "./fields";

type V = LorryHireFormValues;

// ─── Route & dates ───────────────────────────────────────────────────────────

/** State picker (shared flat look), kept in the same grid cell size as every other field. */
function StateField({ name, label }: { name: "from.state" | "to.state"; label: string }) {
  const { control } = useFormContext<V>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <StateAutocomplete flat label={label} value={field.value ?? ""} onChange={field.onChange} />}
    />
  );
}

/** Top of the form: the contract's own identity — number, dates and load type. */
export function LhcDetailsSection({ status }: { status?: ReactNode }) {
  return (
    <FormBlock id="details" title="LHC details" headerRight={status}>
      <FieldGrid>
        <TextField name="lhcNo" label="LHC number" required upper />
        <TextField name="lhcDate" label="LHC date" type="date" required />
        <TextField name="loadingDate" label="Loading date" type="date" />
        <SelectField name="loadType" label="Load type" options={LOAD_TYPES} />
      </FieldGrid>
    </FormBlock>
  );
}

export function RouteSection() {
  const { control, setValue } = useFormContext<V>();
  const [loadingDate, transitDays] = useWatch({ control, name: ["loadingDate", "transitDays"] });

  // ETA follows loading date + transit days.
  useEffect(() => {
    const days = Number(transitDays);
    if (!loadingDate || !(days > 0)) return;
    const d = new Date(loadingDate);
    if (Number.isNaN(d.getTime())) return;
    d.setUTCDate(d.getUTCDate() + days);
    setValue("expectedDeliveryDate", d.toISOString().slice(0, 10), { shouldDirty: true });
  }, [loadingDate, transitDays, setValue]);

  return (
    <FormBlock id="route" title="Route">
      <FieldGrid>
        <TextField name="from.location" label="From city" required placeholder="e.g. Jaipur" />
        <StateField name="from.state" label="From state" />
        <TextField name="to.location" label="To city" required placeholder="e.g. Ahmedabad" />
        <StateField name="to.state" label="To state" />
        <TextField name="via" label="Via (optional)" placeholder="e.g. Udaipur" className="sm:col-span-2" />
        <NumField name="transitDays" label="Transit days" placeholder="0" step="1" />
        <TextField name="expectedDeliveryDate" label="Expected delivery" type="date" />
      </FieldGrid>
    </FormBlock>
  );
}

// ─── Supplier & owner ────────────────────────────────────────────────────────

interface SupplierOption {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string | null;
  panNumber?: string;
  supplierType?: "Broker" | "Owner";
  defaultTdsRate?: number;
  bankDetails?: { accountHolderName?: string; bankName?: string; accountNumber?: string; ifscCode?: string; upiId?: string };
}

export function PartySection() {
  const { control, setValue, getValues } = useFormContext<V>();
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const pickedName = useRef(getValues("supplier.supplierId") ? getValues("supplier.name") : "");
  const [name, supplierId, sameAsSupplier] = useWatch({
    control,
    name: ["supplier.name", "supplier.supplierId", "owner.sameAsSupplier"],
  });

  useEffect(() => {
    let cancelled = false;
    axios
      .get<{ data?: { suppliers?: SupplierOption[] } }>("/api/admin/supplier/get", { params: { itemsPerPage: 200, currentPage: 1 } })
      .then((res) => {
        if (!cancelled) setOptions(res.data?.data?.suppliers ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Editing the name after picking a saved supplier means it's a different party.
  useEffect(() => {
    if (supplierId && pickedName.current && name !== pickedName.current) {
      setValue("supplier.supplierId", "");
      pickedName.current = "";
    }
  }, [name, supplierId, setValue]);

  const items: ComboboxItem[] = options.map((s) => ({
    id: s._id,
    label: s.name,
    subLabel: [s.city, s.gstin].filter(Boolean).join(" · "),
    keywords: `${s.mobile ?? ""} ${s.panNumber ?? ""}`,
  }));

  const pick = (item: ComboboxItem) => {
    const s = options.find((o) => o._id === item.id);
    if (!s) return;
    pickedName.current = s.name;
    const opt = { shouldDirty: true };
    setValue("supplier", {
      supplierId: s._id,
      name: s.name,
      supplierType: s.supplierType ?? "Broker",
      address: s.address ?? "",
      city: s.city ?? "",
      state: s.state ?? "",
      pincode: s.pincode ?? "",
      gstin: s.gstin ?? "",
      pan: s.panNumber ?? "",
      mobile: s.mobile ?? "",
    }, opt);
    if (s.bankDetails) setValue("bank", { accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "", upiId: "", ...s.bankDetails }, opt);
    if (typeof s.defaultTdsRate === "number") setValue("tax.tdsRate", s.defaultTdsRate, opt);
  };

  return (
    <FormBlock id="party" title="Supplier & owner">
      <FieldGrid>
        <div className="col-span-full">
          <Combobox
            variant="flat"
            label="Find a saved supplier"
            placeholder="Search by name, city, GSTIN or mobile…"
            items={items}
            onSelect={pick}
            onCreateNew={() => {
              pickedName.current = "";
              setValue("supplier.supplierId", "");
            }}
            createNewLabel="+ Use a new supplier (type details below)"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            {supplierId ? "Saved supplier selected." : name ? "New supplier — it will be saved to your suppliers when you save the contract." : "Pick one, or type the details below."}
          </p>
        </div>

        <TextField name="supplier.name" label="Supplier name" required className="sm:col-span-2" />
        <SelectField name="supplier.supplierType" label="Type" options={SUPPLIER_TYPES} />
        <TextField name="supplier.mobile" label="Mobile" type="tel" />

        <TextField name="supplier.gstin" label="GSTIN" upper />
        <TextField name="supplier.pan" label="PAN" upper placeholder="ABCDE1234F" />
        <TextField name="supplier.city" label="City" />
        <TextField name="supplier.state" label="State" />

        <TextField name="supplier.address" label="Address" className="sm:col-span-2 lg:col-span-3" />
        <TextField name="supplier.pincode" label="PIN code" />

        <SubHeading>Bank details (for paying the supplier)</SubHeading>
        <TextField name="bank.accountHolderName" label="Account holder" />
        <TextField name="bank.bankName" label="Bank name" />
        <TextField name="bank.accountNumber" label="Account number" />
        <TextField name="bank.ifscCode" label="IFSC" upper />
        <TextField name="bank.upiId" label="UPI ID" />

        <SubHeading>Truck owner</SubHeading>
        <CheckField name="owner.sameAsSupplier" label="Same as the supplier" className="col-span-full" />
        {!sameAsSupplier && (
          <>
            <TextField name="owner.name" label="Owner name" />
            <TextField name="owner.mobile" label="Owner mobile" type="tel" />
            <TextField name="owner.pan" label="Owner PAN" upper />
            <TextField name="owner.address" label="Owner address" />
          </>
        )}
      </FieldGrid>
    </FormBlock>
  );
}
