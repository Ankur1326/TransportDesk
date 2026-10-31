"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { addLorryHirePayment, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { PAYMENT_KINDS, PAYMENT_MODES, type LorryHirePaymentKind, type PaymentMode } from "@/lib/lorry-hire/constants";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Record an advance / part / final payment against an existing contract. */
export function AddPaymentDialog({
  contract,
  onClose,
  onDone,
}: {
  /** null = closed. */
  contract: Pick<LorryHireRecord, "_id" | "lhcNo" | "settlement"> | null;
  onClose: () => void;
  onDone: (updated: LorryHireRecord) => void;
}) {
  return (
    <Dialog open={!!contract} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {/* Remounts per contract so the fields always start fresh. */}
        {contract && <PaymentFields key={contract._id} contract={contract} onClose={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentFields({
  contract,
  onClose,
  onDone,
}: {
  contract: Pick<LorryHireRecord, "_id" | "lhcNo" | "settlement">;
  onClose: () => void;
  onDone: (updated: LorryHireRecord) => void;
}) {
  const balance = contract.settlement.balance;
  const [kind, setKind] = useState<LorryHirePaymentKind>(contract.settlement.totalPaid > 0 ? "Part" : "Advance");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState<PaymentMode>("Cash");
  const [reference, setReference] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [busy, setBusy] = useState(false);

  const value = Number(amount);
  const tooMuch = value > balance + 0.0001;
  const invalid = !(value > 0) || tooMuch || !date;

  const submit = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      const updated = await addLorryHirePayment(contract._id, { kind, amount: value, date, mode, reference, paidTo, remark: "" });
      toast.success(`${inr(value)} recorded against ${contract.lhcNo}.`);
      onDone(updated);
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Couldn't record the payment."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record payment · {contract.lhcNo}</DialogTitle>
        <DialogDescription>Balance to pay: {inr(balance)}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value as LorryHirePaymentKind)} options={PAYMENT_KINDS.map((k) => ({ value: k, label: k }))} />
        <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))} />
        <div>
          <Input label="Amount (₹)" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} error={tooMuch ? "More than the balance." : undefined} />
          <button type="button" className="mt-1 text-caption text-brand-700 hover:underline" onClick={() => { setAmount(String(balance)); setKind("Final"); }}>
            Pay full balance
          </button>
        </div>
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="UTR / cheque no." value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input label="Paid to" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={submit} isLoading={busy} disabled={invalid}>Record payment</Button>
      </DialogFooter>
    </>
  );
}
