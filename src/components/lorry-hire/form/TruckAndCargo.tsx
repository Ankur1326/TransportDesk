"use client";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/Button";
import { Plus, Trash2, Truck } from "@/components/icons";
import { IconSelect } from "@/components/ui/IconSelect";
import { TruckTypeIcon } from "@/components/lorry-hire/TruckTypeIcon";
import { lookupDriver, lookupVehicle, type DriverLookupResult, type VehicleLookupResult } from "@/lib/lorry-hire/api";
import { normalizeVehicleNumber, WEIGHT_UNITS } from "@/lib/lorry-hire/constants";
import { truckTypeChoices } from "@/lib/lorry-hire/truck-types";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { CheckField, FieldGrid, FormBlock, NumField, SelectField, SubHeading, TextField, useFieldError } from "./fields";
import { LrPickerDialog } from "./LrPickerDialog";

type V = LorryHireFormValues;
/** Truck type with a picture of each type. A saved value that isn't in the list stays selectable. */
function TruckTypeField() {
  const { control } = useFormContext<V>();
  const error = useFieldError("truck.truckType");
  const current = useWatch({ control, name: "truck.truckType" });
  const options = useMemo(
    () => truckTypeChoices(current).map((c) => ({ value: c.value, label: c.value, icon: <TruckTypeIcon type={c.value} className="h-8 w-16" /> })),
    [current]
  );
  return (
    <Controller
      control={control}
      name="truck.truckType"
      render={({ field }) => (
        <IconSelect label="Truck type" placeholder="Select truck type" value={field.value ?? ""} onChange={field.onChange} options={options} error={error} />
      )}
    />
  );
}

// ─── Truck & driver ──────────────────────────────────────────────────────────

export function TruckSection() {
  const { setValue, getValues } = useFormContext<V>();
  const [vehicleLookup, setVehicleLookup] = useState<VehicleLookupResult | null>(null);
  const [driverLookup, setDriverLookup] = useState<DriverLookupResult | null>(null);
  const [vehicleWarnings, setVehicleWarnings] = useState<string[]>([]);
  const [driverWarnings, setDriverWarnings] = useState<string[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [savingMaster, setSavingMaster] = useState(false);
  const hint = vehicleLookup?.lastContract ?? null;

  // Typing a known truck number offers its last driver / owner / type in one tap.
  const checkVehicle = async () => {
    const vn = normalizeVehicleNumber(getValues("truck.vehicleNumber") ?? "");
    if (vn.length < 6) {
      setVehicleLookup(null);
      setVehicleWarnings([]);
      return;
    }
    try {
      setLookupError("");
      const result = await lookupVehicle(vn);
      setVehicleLookup(result);
      setVehicleWarnings(result.expiredDocuments);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Unable to look up this vehicle.");
    }
  };

  const checkDriver = async () => {
    const mobile = getValues("driver.mobile") ?? "";
    const name = getValues("driver.name") ?? "";
    if (mobile.replace(/\D/g, "").length < 10 && !name.trim()) {
      setDriverLookup(null);
      setDriverWarnings([]);
      return;
    }
    try {
      setLookupError("");
      const result = await lookupDriver(mobile, name);
      setDriverLookup(result);
      setDriverWarnings(result.expiredDocuments);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Unable to look up this driver.");
    }
  };

  const applyHint = () => {
    if (!vehicleLookup) return;
    const o = { shouldDirty: true };
    if (hint?.driver) setValue("driver", { name: "", mobile: "", licenseNumber: "", ...hint.driver, licenseExpiry: hint.driver.licenseExpiry?.slice(0, 10) ?? "" }, o);
    if (hint?.owner) setValue("owner", { sameAsSupplier: false, name: "", mobile: "", pan: "", address: "", ...hint.owner }, o);
    if (hint?.insurance) setValue("insurance", { company: "", policyNumber: "", ...hint.insurance, validUpto: hint.insurance.validUpto?.slice(0, 10) ?? "" }, o);
    if (hint?.truck) {
      const t = hint.truck;
      setValue("truck.truckType", t.truckType ?? "", o);
      setValue("truck.capacity", t.capacity ?? 0, o);
      setValue("truck.capacityUnit", t.capacityUnit ?? "MTS", o);
      setValue("truck.chassisNo", t.chassisNo ?? "", o);
      setValue("truck.engineNo", t.engineNo ?? "", o);
      setValue("truck.permitNo", t.permitNo ?? "", o);
      setValue("truck.isOversize", !!t.isOversize, o);
    }
    const master = vehicleLookup.master;
    if (master) {
      setValue("truck.truckType", master.truckType, o);
      setValue("truck.capacity", master.capacity, o);
      setValue("truck.capacityUnit", master.capacityUnit, o);
      setValue("truck.chassisNo", master.chassisNo, o);
      setValue("truck.engineNo", master.engineNo, o);
    }
    if (master?.defaultDriverId && !hint?.driver) {
      setLookupError("This vehicle has a default driver assigned. Select that driver from the driver master to fill their details.");
    }
    setVehicleLookup(null);
  };

  const saveVehicleToMaster = async () => {
    const registrationNumber = normalizeVehicleNumber(getValues("truck.vehicleNumber") ?? "");
    if (registrationNumber.length < 6) return;
    setSavingMaster(true);
    setLookupError("");
    try {
      const response = await fetch("/api/admin/fleet/vehicles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          registrationNumber,
          ownership: "Market",
          truckType: getValues("truck.truckType") ?? "",
          capacity: Number(getValues("truck.capacity")) || 0,
          capacityUnit: getValues("truck.capacityUnit") ?? "MTS",
          chassisNo: getValues("truck.chassisNo") ?? "",
          engineNo: getValues("truck.engineNo") ?? "",
          status: "Active",
        }),
      });
      const result = await response.json() as { success?: boolean; message?: string; data?: VehicleLookupResult["master"] };
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || "Unable to save vehicle to master.");
      setVehicleLookup((current) => current ? { ...current, master: result.data ?? null } : current);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Unable to save vehicle to master.");
    } finally {
      setSavingMaster(false);
    }
  };

  const saveDriverToMaster = async () => {
    setSavingMaster(true);
    setLookupError("");
    try {
      const response = await fetch("/api/admin/fleet/drivers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: getValues("driver.name") ?? "",
          mobile: getValues("driver.mobile") ?? "",
          licenseNumber: getValues("driver.licenseNumber") ?? "",
          licenseExpiry: getValues("driver.licenseExpiry") ?? "",
          status: "Active",
        }),
      });
      const result = await response.json() as { success?: boolean; message?: string; data?: DriverLookupResult["master"] };
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || "Unable to save driver to master.");
      setDriverLookup((current) => current ? { ...current, master: result.data ?? null } : current);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Unable to save driver to master.");
    } finally {
      setSavingMaster(false);
    }
  };

  const applyDriverLookup = () => {
    if (!driverLookup) return;
    const driver = driverLookup.master ?? driverLookup.derived;
    if (!driver) return;
    setValue("driver", {
      name: driver.name ?? "",
      mobile: driver.mobile ?? "",
      licenseNumber: driver.licenseNumber ?? "",
      licenseExpiry: "licenseExpiry" in driver ? driver.licenseExpiry?.slice(0, 10) ?? "" : "",
    }, { shouldDirty: true });
  };

  return (
    <FormBlock id="truck" title="Truck & driver" hint="Type the truck number first — we'll offer its last details.">
      <FieldGrid>
        <div onBlur={checkVehicle} onChange={() => { setVehicleLookup(null); setVehicleWarnings([]); }}>
          <TextField name="truck.vehicleNumber" label="Truck number" required upper placeholder="MH23AU6718" />
        </div>
        <TruckTypeField />
        <NumField name="truck.capacity" label="Capacity" />
        <SelectField name="truck.capacityUnit" label="Unit" options={WEIGHT_UNITS} />

        {vehicleLookup && (
          <div className="col-span-full flex flex-wrap items-center justify-between gap-2 border border-brand-200 bg-brand-50 px-3 py-2">
            <p className="flex items-center gap-2 text-body-sm text-neutral-800">
              <Truck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              {vehicleLookup.master
                ? `Vehicle master found: ${vehicleLookup.master.registrationNumber} · ${vehicleLookup.master.ownership}`
                : hint ? `Historical LHC found (${hint.lhcNo})` : "No vehicle master or previous LHC found."}
              {hint && ` · ${[hint.driver?.name && `driver ${hint.driver.name}`, hint.owner?.name && `owner ${hint.owner.name}`, hint.truck?.truckType].filter(Boolean).join(" · ")}`}
            </p>
            <div className="flex gap-2">
              {(vehicleLookup.master || hint) && <Button type="button" size="sm" onClick={applyHint}>Use details</Button>}
              {!vehicleLookup.master && <Button type="button" size="sm" variant="outline" isLoading={savingMaster} onClick={() => void saveVehicleToMaster()}>Save to master (Market)</Button>}
              <Button type="button" size="sm" variant="ghost" onClick={() => setVehicleLookup(null)}>Dismiss</Button>
            </div>
          </div>
        )}

        <TextField name="truck.chassisNo" label="Chassis no." upper />
        <TextField name="truck.engineNo" label="Engine no." upper />
        <TextField name="truck.permitNo" label="Permit no." />
        <CheckField name="truck.isOversize" label="Oversize load" className="self-end" />

        <SubHeading>Driver</SubHeading>
        <div className="contents" onChange={() => { setDriverLookup(null); setDriverWarnings([]); }}>
          <div onBlur={checkDriver}>
            <TextField name="driver.name" label="Driver name" />
          </div>
          <div onBlur={checkDriver}>
            <TextField name="driver.mobile" label="Driver mobile" type="tel" />
          </div>
        </div>
        <TextField name="driver.licenseNumber" label="Licence number" upper />
        <TextField name="driver.licenseExpiry" label="Licence valid upto" type="date" />

        {driverLookup && (
          <div className="col-span-full flex flex-wrap items-center justify-between gap-2 border border-brand-200 bg-brand-50 px-3 py-2">
            <p className="text-body-sm text-neutral-800">
              {driverLookup.master ? `Driver master found: ${driverLookup.master.name}` : driverLookup.derived ? `Historical driver found: ${driverLookup.derived.name}` : "No driver master or previous LHC found."}
            </p>
            {(driverLookup.master || driverLookup.derived) && <Button type="button" size="sm" onClick={applyDriverLookup}>Use details</Button>}
            {!driverLookup.master && <Button type="button" size="sm" variant="outline" isLoading={savingMaster} onClick={() => void saveDriverToMaster()}>Save to master</Button>}
          </div>
        )}
        {vehicleWarnings.length ? (
          <div className="col-span-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="status">
            Warning: this vehicle has expired documents: {vehicleWarnings.join(", ")}. This will not prevent saving the LHC.
          </div>
        ) : null}
        {driverWarnings.length ? (
          <div className="col-span-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="status">
            Warning: this driver has expired documents: {driverWarnings.join(", ")}. This will not prevent saving the LHC.
          </div>
        ) : null}
        {lookupError && <p className="col-span-full text-sm text-red-700" role="alert">{lookupError}</p>}

        <SubHeading>Insurance</SubHeading>
        <TextField name="insurance.company" label="Insurance company" className="sm:col-span-2" />
        <TextField name="insurance.policyNumber" label="Policy number" />
        <TextField name="insurance.validUpto" label="Valid upto" type="date" />
      </FieldGrid>
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
        <div className="flex items-end gap-2">
          <div className="w-28"><SelectField name="weightUnit" label="Weights in" options={WEIGHT_UNITS} /></div>
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
          <div key={f.id} className="grid grid-cols-2 gap-x-4 gap-y-3 border border-neutral-200 bg-neutral-50/50 p-3 md:grid-cols-12">
            <TextField name={`items.${i}.cnNo`} label="CN / LR no." required upper className="md:col-span-2" />
            <TextField name={`items.${i}.cnDate`} label="Date" type="date" className="md:col-span-2" />
            <TextField name={`items.${i}.description`} label="Description" className="col-span-2 md:col-span-3" />
            <NumField name={`items.${i}.packages`} label="Pkgs" className="md:col-span-1" step="1" />
            <NumField name={`items.${i}.actualWeight`} label="Actual wt" className="md:col-span-2" />
            <NumField name={`items.${i}.chargedWeight`} label="Charged wt" className="md:col-span-2" />
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
