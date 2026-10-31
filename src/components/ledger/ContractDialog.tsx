"use client";

import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AppDispatch } from "@/redux/store";
import { createContract, updateContract, type ContractFields } from "@/redux/slices/ledgerSlice";
import type { LedgerEntry } from "@/lib/ledger/build-ledger";
import { contractTotalPayable } from "@/lib/ledger/build-supplier-ledger";
import { formatInr } from "@/lib/ledger/format";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/ledger/payment-modes";

interface Props {
  supplierId: string;
  supplierName: string;
  /** A contract entry from the ledger (its meta carries every field), or null to add a new contract. */
  editing: LedgerEntry | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const field =
  "h-10 w-full rounded-lg border border-(--ledger-line) bg-(--ledger-card) px-3 text-sm outline-none transition focus:border-(--ledger-edge) focus:ring-2 focus:ring-(--ledger-accent-soft)";
const label = "block text-xs font-medium text-neutral-600 dark:text-neutral-300";

const pad = (n: number) => String(n).padStart(2, "0");
const todayInput = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const str = (e: LedgerEntry | null, key: string): string => {
  const v = e?.meta[key];
  return typeof v === "string" ? v : "";
};
const num = (e: LedgerEntry | null, key: string): string => {
  const v = e?.meta[key];
  return typeof v === "number" && v > 0 ? String(v) : "";
};
const toNumber = (v: string): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** "LR1, LR2  LR3" -> ["LR1", "LR2", "LR3"] */
const parseLrs = (v: string): string[] => [...new Set(v.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];

export function ContractDialog({ supplierId, supplierName, editing, onClose, onSaved }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const firstRef = useRef<HTMLInputElement>(null);

  const [contractNo, setContractNo] = useState(() => (editing ? editing.refNo : ""));
  const [date, setDate] = useState(() => (editing ? editing.date.slice(0, 10) : todayInput()));
  const [vehicleNo, setVehicleNo] = useState(() => str(editing, "vehicleNo"));
  const [lrs, setLrs] = useState(() => {
    const items = editing?.meta.items;
    return Array.isArray(items) ? items.map((i: { cnsNo?: string }) => i.cnsNo ?? "").filter(Boolean).join(", ") : "";
  });
  const [hireAmount, setHireAmount] = useState(() => num(editing, "hireAmount"));
  const [otherCharges, setOtherCharges] = useState(() => num(editing, "otherCharges"));
  const [deductions, setDeductions] = useState(() => num(editing, "deductions"));
  const [tdsAmount, setTdsAmount] = useState(() => num(editing, "tdsAmount"));
  const [advancePaid, setAdvancePaid] = useState(() => num(editing, "advancePaid"));
  const [advanceDate, setAdvanceDate] = useState(() => str(editing, "advanceDate") || (editing ? "" : todayInput()));
  const [advanceVia, setAdvanceVia] = useState<PaymentMode>(() => {
    const m = str(editing, "advanceVia");
    return (PAYMENT_MODES as readonly string[]).includes(m) ? (m as PaymentMode) : "Cash";
  });
  const [remark, setRemark] = useState(() => str(editing, "remark"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = contractTotalPayable({
    hireAmount: toNumber(hireAmount),
    otherCharges: toNumber(otherCharges),
    deductions: toNumber(deductions),
    tdsAmount: toNumber(tdsAmount),
  });
  const advance = toNumber(advancePaid);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    if (!contractNo.trim()) return setError("Enter a contract number.");
    if (!date) return setError("Pick a date.");
    if (toNumber(hireAmount) <= 0) return setError("Enter the hire amount.");
    if (total <= 0) return setError("Total payable must be greater than 0.");
    if (advance > total) return setError("Advance cannot be more than the total payable.");

    const fields: ContractFields = {
      contractNo: contractNo.trim(),
      date,
      vehicleNo: vehicleNo.trim(),
      consignmentNos: parseLrs(lrs),
      hireAmount: toNumber(hireAmount),
      otherCharges: toNumber(otherCharges),
      deductions: toNumber(deductions),
      tdsAmount: toNumber(tdsAmount),
      advancePaid: advance,
      advanceDate: advance > 0 ? advanceDate || date : "",
      advanceVia,
      remark: remark.trim(),
    };
    setSaving(true);
    setError("");
    try {
      const result = editing
        ? await dispatch(updateContract({ ...fields, _id: editing.sourceId })).unwrap()
        : await dispatch(createContract({ ...fields, supplierId })).unwrap();
      onSaved(result.message);
    } catch (err) {
      setError(typeof err === "string" ? err : "Couldn't save this contract. Please try again.");
      setSaving(false);
    }
  };

  const money = (value: string, set: (v: string) => void, name: string, required = false) => (
    <label className={label}>
      {name}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        className={cn(field, "mt-1 tabular-nums")}
        value={value}
        onChange={(e) => set(e.target.value)}
        required={required}
        placeholder="0"
      />
    </label>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg" initialFocus={firstRef}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lorry hire contract" : "Add lorry hire contract"}</DialogTitle>
          <DialogDescription>{supplierName}. The total becomes a payable (Cr) on the ledger.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Contract no.
              <input ref={firstRef} className={cn(field, "mt-1")} value={contractNo} onChange={(e) => setContractNo(e.target.value)} maxLength={50} />
            </label>
            <label className={label}>
              Date
              <input type="date" className={cn(field, "mt-1")} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className={label}>
              Vehicle no.
              <input className={cn(field, "mt-1 uppercase")} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} maxLength={20} placeholder="RJ14 GA 1234" />
            </label>
            <label className={label}>
              LR numbers
              <input className={cn(field, "mt-1")} value={lrs} onChange={(e) => setLrs(e.target.value)} placeholder="1021, 1022" aria-describedby="lr-hint" />
            </label>
          </div>
          <p id="lr-hint" className="-mt-2 text-[11px] text-neutral-500">Separate LR numbers with commas. Used for search only.</p>

          <div className="grid grid-cols-2 gap-3">
            {money(hireAmount, setHireAmount, "Hire amount (₹)", true)}
            {money(otherCharges, setOtherCharges, "Other charges (₹)")}
            {money(deductions, setDeductions, "Deductions (₹)")}
            {money(tdsAmount, setTdsAmount, "TDS withheld (₹)")}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-(--ledger-surface) px-3 py-2.5 text-sm" aria-live="polite">
            <span className="text-neutral-500">Total payable (Cr)</span>
            <b className="tabular-nums text-(--payable)">{formatInr(total)}</b>
          </div>

          <fieldset className="space-y-2 rounded-xl border border-(--ledger-line) p-3">
            <legend className="px-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">Advance paid (optional)</legend>
            <div className="grid grid-cols-2 gap-3">
              {money(advancePaid, setAdvancePaid, "Amount (₹)")}
              <label className={label}>
                Date
                <input type="date" className={cn(field, "mt-1")} value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} />
              </label>
            </div>
            <div role="group" aria-label="Advance paid via" className="flex flex-wrap gap-1.5">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={advanceVia === m}
                  onClick={() => setAdvanceVia(m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    advanceVia === m
                      ? "border-(--ledger-edge) bg-(--ledger-accent-soft) text-(--ledger-edge)"
                      : "border-(--ledger-line) text-neutral-600 hover:bg-(--ledger-surface) dark:text-neutral-300"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <label className={label}>
            Remark
            <input className={cn(field, "mt-1")} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-(--receivable-soft) px-3 py-2 text-xs font-medium text-(--receivable)">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editing ? "Save changes" : "Add contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
