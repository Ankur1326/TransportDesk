"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/Button";
import { Plus, Trash2 } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { removeLorryHirePayment, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { suggestTdsRate } from "@/lib/lorry-hire/calculations";
import {
  DEFAULT_LORRY_CHARGE_PRESETS,
  FREIGHT_PAID_BY,
  GST_MODES,
  GST_RATE_OPTIONS,
  PAYMENT_KINDS,
  PAYMENT_MODES,
  RATE_MODES,
  TDS_MODES,
  TDS_SECTIONS,
  WEIGHT_UNITS,
} from "@/lib/lorry-hire/constants";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { AddPaymentDialog } from "../AddPaymentDialog";
import { CheckField, FieldGrid, FormBlock, NumField, SelectField, SubHeading, TextAreaField, TextField } from "./fields";
import { SignaturePad } from "./SignaturePad";
import { Controller } from "react-hook-form";
import { useLorryHireSummary } from "./SettlementCard";

type V = LorryHireFormValues;
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RATE_LABEL: Record<string, string> = {
  Fixed: "Freight amount (₹)",
  "Per Tonne": "Rate per tonne (₹)",
  "Per Kg": "Rate per kg (₹)",
  "Per Package": "Rate per package (₹)",
};

// ─── Freight & tax ───────────────────────────────────────────────────────────

export function FreightSection() {
  const { control, setValue } = useFormContext<V>();
  const { fields, append, remove } = useFieldArray({ control, name: "charges" });
  const [rateMode, gstMode, tdsRate, pan, charges] = useWatch({
    control,
    name: ["freight.rateMode", "tax.gstMode", "tax.tdsRate", "supplier.pan", "charges"],
  });
  const { s } = useLorryHireSummary();
  const suggestion = suggestTdsRate({ pan });

  return (
    <FormBlock id="freight" title="Freight & tax">
      <FieldGrid>
        <SelectField name="freight.rateMode" label="Rate type" options={RATE_MODES} />
        <NumField name="freight.rate" label={RATE_LABEL[rateMode ?? "Fixed"]} />
        <SelectField name="freight.freightPaidBy" label="Freight paid by" options={FREIGHT_PAID_BY} />
        {rateMode !== "Fixed" && (
          <p className="self-end pb-2 text-[11px] text-neutral-500">
            Basis: {s.quantity} {rateMode === "Per Tonne" ? "tonnes" : rateMode === "Per Kg" ? "kg" : "packages"} × rate = {inr(s.basicFreight)}
          </p>
        )}

        <SubHeading>Add-ons (+) and deductions (−)</SubHeading>
        <div className="col-span-full flex flex-wrap gap-2">
        {DEFAULT_LORRY_CHARGE_PRESETS.map((p) => {
          const used = (charges ?? []).some((c) => c.chargeId === p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={used}
              onClick={() => append({ chargeId: p.id, name: p.name, kind: p.kind, amount: 0 })}
              className="border border-neutral-300 bg-white px-2.5 py-1 text-caption text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {p.kind === "add" ? "+" : "−"} {p.name}
            </button>
          );
        })}
        </div>
        {fields.length > 0 && (
        <div className="col-span-full space-y-2">
        {fields.map((f, i) => (
          <div key={f.id} className="flex items-end gap-3">
            <div className="flex h-10 flex-1 items-center text-[13px] font-medium text-neutral-800">
              <span className={f.kind === "add" ? "text-success-700" : "text-error-700"}>{f.kind === "add" ? "+" : "−"}</span> {f.name}
            </div>
            <NumField name={`charges.${i}.amount`} label="Amount (₹)" className="w-40" />
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => remove(i)} className="flex h-10 items-center text-neutral-500 hover:text-error-700">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        </div>
        )}

        <SubHeading>Tax</SubHeading>
        <SelectField name="tax.gstMode" label="GST" options={GST_MODES} />
        <SelectField name="tax.tdsMode" label="TDS" options={TDS_MODES} />
        <NumField name="tax.tdsRate" label="TDS rate %" />
        <SelectField name="tax.tdsSection" label="TDS section" options={TDS_SECTIONS} />
        {gstMode === "GST" && <SelectField name="tax.gstRate" label="GST rate %" options={GST_RATE_OPTIONS} number />}
        <CheckField name="tax.roundOff" label="Round off" className="self-end" />
        {gstMode === "RCM" && <p className="col-span-full -mt-1 text-[11px] text-neutral-500">Reverse charge: 5% is shown but not added — you pay it directly.</p>}
      </FieldGrid>
      <p className="mt-3 text-caption text-neutral-500">
        Suggested TDS: {suggestion.rate}% — {suggestion.reason}{" "}
        {suggestion.rate !== Number(tdsRate) && (
          <button type="button" className="text-brand-700 hover:underline" onClick={() => setValue("tax.tdsRate", suggestion.rate, { shouldDirty: true })}>
            Apply
          </button>
        )}{" "}
        <span className="text-neutral-400">Please confirm with your CA.</span>
      </p>
    </FormBlock>
  );
}

// ─── Payments ────────────────────────────────────────────────────────────────

const EMPTY_PAYMENT = { paymentId: "", kind: "Advance" as const, amount: 0, date: "", mode: "Cash" as const, reference: "", paidTo: "", remark: "" };

/**
 * Create mode: payments are typed into the form and saved with the contract.
 * Edit mode: they are recorded / removed through the payments API.
 */
export function PaymentsSection({
  record,
  onRecordChange,
}: {
  record?: LorryHireRecord;
  onRecordChange?: (r: LorryHireRecord) => void;
}) {
  const { control } = useFormContext<V>();
  const { fields, append, remove } = useFieldArray({ control, name: "payments" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  if (!record) {
    return (
      <FormBlock
        id="payments"
        title="Advance & payments"
        hint="Optional. You can also record payments later from the list."
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => append({ ...EMPTY_PAYMENT, date: new Date().toISOString().slice(0, 10) })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add payment
          </Button>
        }
      >
        {fields.length === 0 && <p className="text-body-sm text-neutral-500">No payment recorded yet.</p>}
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="border border-neutral-200 bg-neutral-50/50 p-3">
              <FieldGrid>
                <SelectField name={`payments.${i}.kind`} label="Type" options={PAYMENT_KINDS} />
                <NumField name={`payments.${i}.amount`} label="Amount (₹)" />
                <TextField name={`payments.${i}.date`} label="Date" type="date" />
                <SelectField name={`payments.${i}.mode`} label="Mode" options={PAYMENT_MODES} />
                <TextField name={`payments.${i}.reference`} label="UTR / cheque" className="sm:col-span-2" />
                <TextField name={`payments.${i}.paidTo`} label="Paid to" className="sm:col-span-2" />
              </FieldGrid>
              <button type="button" onClick={() => remove(i)} className="mt-2 inline-flex items-center gap-1 text-caption text-error-700 hover:underline">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            </div>
          ))}
        </div>
      </FormBlock>
    );
  }

  const cancelled = record.status === "Cancelled";
  const pct = record.settlement.netPayable > 0 ? Math.min(100, (record.settlement.totalPaid / record.settlement.netPayable) * 100) : 0;

  const confirmRemove = async () => {
    if (!removeId) return;
    try {
      onRecordChange?.(await removeLorryHirePayment(record._id, removeId));
      toast.success("Payment removed.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Couldn't remove the payment."));
    } finally {
      setRemoveId(null);
    }
  };

  return (
    <FormBlock
      id="payments"
      title="Payments"
      hint="Saved immediately — no need to press Save."
      action={
        <Button type="button" size="sm" variant="outline" disabled={cancelled || record.settlement.balance <= 0} onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add payment
        </Button>
      }
    >
      <div className="h-2 w-full bg-neutral-100" aria-hidden="true">
        <div className="h-2 bg-success-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-caption text-neutral-500">{inr(record.settlement.totalPaid)} paid of {inr(record.settlement.netPayable)}</p>

      {record.payments.length === 0 && <p className="mt-3 text-body-sm text-neutral-500">No payments yet.</p>}
      <ul className="mt-3 divide-y divide-neutral-100">
        {record.payments.map((p) => (
          <li key={p._id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
            <span>
              <span className="font-medium">{p.kind}</span> · {p.mode}
              {p.reference ? ` · ${p.reference}` : ""}
              <span className="block text-caption text-neutral-500">{p.date.slice(0, 10)}{p.paidTo ? ` · to ${p.paidTo}` : ""}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-semibold tabular-nums">{inr(p.amount)}</span>
              <button type="button" aria-label="Remove payment" onClick={() => setRemoveId(p._id)} className="text-neutral-500 hover:text-error-700">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <AddPaymentDialog contract={dialogOpen ? record : null} onClose={() => setDialogOpen(false)} onDone={(r) => onRecordChange?.(r)} />
      <ConfirmDialog
        open={!!removeId}
        title="Remove this payment?"
        description="The balance goes back up and the supplier ledger entry is removed."
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoveId(null)}
      />
    </FormBlock>
  );
}

// ─── Notes, shortage, signature ──────────────────────────────────────────────

export function NotesSection() {
  const { control } = useFormContext<V>();
  return (
    <FormBlock id="notes" title="Shortage, remarks & signature">
      <FieldGrid>
        <NumField name="shortage.amount" label="Shortage amount (₹)" />
        <NumField name="shortage.quantity" label="Shortage quantity" />
        <SelectField name="shortage.unit" label="Unit" options={WEIGHT_UNITS} />
        <TextField name="shortage.note" label="Shortage note" />

        <TextAreaField name="remarks" label="Remarks (printed)" className="sm:col-span-2" />
        <TextAreaField name="internalNotes" label="Internal notes (not printed)" className="sm:col-span-2" />

        <TextField name="preparedBy" label="Prepared by" className="sm:col-span-2" />
        <TextField name="passedBy" label="Passed by" className="sm:col-span-2" />

        <div className="col-span-full">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-600">Driver&apos;s signature</p>
          <Controller
            control={control}
            name="driverSignature"
            render={({ field }) => <SignaturePad value={field.value ?? ""} onChange={field.onChange} />}
          />
        </div>
      </FieldGrid>
    </FormBlock>
  );
}
