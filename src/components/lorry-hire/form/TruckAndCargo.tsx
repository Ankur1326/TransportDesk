"use client";
import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/Button";
import { Plus, Trash2, Truck } from "@/components/icons";
import { lookupVehicle, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { normalizeVehicleNumber, WEIGHT_UNITS } from "@/lib/lorry-hire/constants";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { CheckField, FormBlock, MoreDetails, NumField, SelectField, TextField } from "./fields";
import { LrPickerDialog } from "./LrPickerDialog";

type V = LorryHireFormValues;
type Last = Partial<LorryHireRecord>;

const TRUCK_TYPES = ["Mini Truck (Tempo)", "Pickup", "Open Truck", "Closed Container", "Trailer", "Tanker", "Tipper"];

// ─── Truck & driver ──────────────────────────────────────────────────────────

export function TruckSection() {
  const { control, setValue, getValues } = useFormContext<V>();
  const [hint, setHint] = useState<Last | null>(null);
  const [chassis, permit, insurer, licExpiry] = useWatch({
    control,
    name: ["truck.chassisNo", "truck.permitNo", "insurance.company", "driver.licenseExpiry"],
  });

  // Typing a known truck number offers its last driver / owner / type in one tap.
  const checkVehicle = async () => {
    const vn = normalizeVehicleNumber(getValues("truck.vehicleNumber") ?? "");
    if (vn.length < 6) return setHint(null);
    try {
      const last = await lookupVehicle(vn);
      setHint(last && (last.driver?.name || last.owner?.name || last.truck?.truckType) ? last : null);
    } catch {
      setHint(null);
    }
  };

  const applyHint = () => {
    if (!hint) return;
    const o = { shouldDirty: true };
    if (hint.driver) setValue("driver", { name: "", mobile: "", licenseNumber: "", ...hint.driver, licenseExpiry: hint.driver.licenseExpiry?.slice(0, 10) ?? "" }, o);
    if (hint.owner) setValue("owner", { sameAsSupplier: false, name: "", mobile: "", pan: "", address: "", ...hint.owner }, o);
    if (hint.insurance) setValue("insurance", { company: "", policyNumber: "", ...hint.insurance, validUpto: hint.insurance.validUpto?.slice(0, 10) ?? "" }, o);
    if (hint.truck) {
      const t = hint.truck;
      setValue("truck.truckType", t.truckType ?? "", o);
      setValue("truck.capacity", t.capacity ?? 0, o);
      setValue("truck.capacityUnit", t.capacityUnit ?? "MTS", o);
      setValue("truck.chassisNo", t.chassisNo ?? "", o);
      setValue("truck.engineNo", t.engineNo ?? "", o);
      setValue("truck.permitNo", t.permitNo ?? "", o);
      setValue("truck.isOversize", !!t.isOversize, o);
    }
    setHint(null);
  };

  return (
    <FormBlock id="truck" title="Truck & driver" hint="Type the truck number first — we'll offer its last details.">
      <div onBlur={checkVehicle}>
        <TextField name="truck.vehicleNumber" label="Truck number" required upper placeholder="MH23AU6718" className="max-w-xs" />
      </div>

      {hint && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-brand-200 bg-brand-50 px-3 py-2">
          <p className="flex items-center gap-2 text-body-sm text-neutral-800">
            <Truck className="h-4 w-4 text-brand-700" aria-hidden="true" />
            Hired before ({hint.lhcNo}):{" "}
            {[hint.driver?.name && `driver ${hint.driver.name}`, hint.owner?.name && `owner ${hint.owner.name}`, hint.truck?.truckType].filter(Boolean).join(" · ")}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={applyHint}>Use last details</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setHint(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <datalist id="lhc-truck-types">
        {TRUCK_TYPES.map((t) => <option key={t} value={t} />)}
      </datalist>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TextField name="truck.truckType" label="Truck type" list="lhc-truck-types" className="col-span-2" />
        <NumField name="truck.capacity" label="Capacity" />
        <SelectField name="truck.capacityUnit" label="Unit" options={WEIGHT_UNITS} />
      </div>
      <div className="mt-3"><CheckField name="truck.isOversize" label="Oversize load" /></div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField name="driver.name" label="Driver name" />
        <TextField name="driver.mobile" label="Driver mobile" type="tel" />
        <TextField name="driver.licenseNumber" label="Licence number" upper />
      </div>

      <MoreDetails label="Chassis, engine, permit, insurance, licence expiry" hasData={Boolean(chassis || permit || insurer || licExpiry)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField name="truck.chassisNo" label="Chassis no." upper />
          <TextField name="truck.engineNo" label="Engine no." upper />
          <TextField name="truck.permitNo" label="Permit no." />
          <TextField name="driver.licenseExpiry" label="Licence valid upto" type="date" />
          <TextField name="insurance.company" label="Insurance company" />
          <TextField name="insurance.policyNumber" label="Policy number" />
          <TextField name="insurance.validUpto" label="Insurance valid upto" type="date" />
        </div>
      </MoreDetails>
    </FormBlock>
  );
}

// ─── Cargo ───────────────────────────────────────────────────────────────────

const EMPTY_ITEM = {
  consignmentId: "", cnNo: "", cnDate: "", from: "", to: "", description: "", packages: 0, actualWeight: 0, chargedWeight: 0,
};

export function CargoSection() {
  const { control } = useFormContext<V>();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" }) ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);

  const total = (k: "packages" | "actualWeight" | "chargedWeight") =>
    Math.round(items.reduce((s, i) => s + (Number(i?.[k]) || 0), 0) * 1000) / 1000;

  return (
    <FormBlock
      id="cargo"
      title="Cargo"
      hint="Import LRs, or type the consignments by hand."
      action={
        <div className="flex items-center gap-2">
          <div className="w-24"><SelectField name="weightUnit" label="Weights in" options={WEIGHT_UNITS} /></div>
          <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>Add from LR</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => append(EMPTY_ITEM)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Row
          </Button>
        </div>
      }
    >
      {fields.length === 0 && (
        <p className="py-4 text-center text-body-sm text-neutral-500">
          No cargo yet. Use “Add from LR” or add a row. A contract can also be saved without cargo.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-2 gap-3 border border-neutral-200 bg-neutral-50/50 p-3 md:grid-cols-12">
            <TextField name={`items.${i}.cnNo`} label="CN / LR no." required upper className="md:col-span-2" />
            <TextField name={`items.${i}.cnDate`} label="Date" type="date" className="md:col-span-2" />
            <TextField name={`items.${i}.description`} label="Description" className="col-span-2 md:col-span-4" />
            <NumField name={`items.${i}.packages`} label="Pkgs" className="md:col-span-1" step="1" />
            <NumField name={`items.${i}.actualWeight`} label="Actual wt" className="md:col-span-1" />
            <NumField name={`items.${i}.chargedWeight`} label="Charged wt" className="md:col-span-1" />
            <div className="col-span-2 flex items-center justify-between md:col-span-12">
              <span className="text-caption text-neutral-500">
                {items[i]?.consignmentId ? "Linked to LR" : "Typed manually"}
                {(items[i]?.from || items[i]?.to) && ` · ${items[i]?.from ?? ""} → ${items[i]?.to ?? ""}`}
              </span>
              <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 text-caption text-error-700 hover:underline">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <p className="mt-3 text-right text-body-sm font-medium text-neutral-700">
          Total: {total("packages")} pkgs · {total("actualWeight")} actual · {total("chargedWeight")} charged
        </p>
      )}

      <LrPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingIds={items.map((i) => i?.consignmentId ?? "").filter(Boolean)}
        onAdd={(rows) => rows.forEach((r) => append(r))}
      />
    </FormBlock>
  );
}
