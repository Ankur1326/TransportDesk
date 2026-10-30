"use client";

import { ArrowDownLeft, ArrowUpRight } from "@/components/ledger/ledger-icons";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AppDispatch } from "@/redux/store";
import { allocatePayment, createPayment, updatePayment, type PaymentFields } from "@/redux/slices/ledgerSlice";
import type { BillStatusInfo, LedgerEntry } from "@/lib/ledger/build-ledger";
import { planAllocation, sortOldestFirst } from "@/lib/ledger/allocate";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/ledger/payment-modes";

export type PaymentDirection = "received" | "receivable_adjustment";
type Apply = "auto" | "bill" | "none";

interface Props {
  customerId: string;
  customerName: string;
  /** Unfiltered net balance before this change (> 0 means the customer owes us). */
  netBalance: number;
  /** Every bill of this customer, keyed by id (unfiltered). */
  billStatuses: Record<string, BillStatusInfo>;
  direction: PaymentDirection;
  /** Set to edit an existing payment / manual debit instead of creating one. */
  editing: LedgerEntry | null;
  /** Pre-select this bill ("Record payment for this bill"). */
  presetBillId?: string;
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
const round2 = (n: number) => Math.round(n * 100) / 100;
const metaText = (e: LedgerEntry | null, key: string): string => {
  const v = e?.meta[key];
  return typeof v === "string" ? v : "";
};

/** "₹X receivable (Dr)" / "₹X advance (Cr)" / "Settled". */
function describeNet(net: number): string {
  const n = round2(net);
  if (n > 0) return `${formatInr(n)} receivable (Dr)`;
  if (n < 0) return `${formatInr(n)} advance (Cr)`;
  return "Settled (₹0)";
}

export function RecordPaymentDialog({
  customerId,
  customerName,
  netBalance,
  billStatuses,
  direction,
  editing,
  presetBillId,
  onClose,
  onSaved,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const amountRef = useRef<HTMLInputElement>(null);
  const isReceived = direction === "received";

  // The payment being edited no longer counts against its own bill, so that
  // bill's room is its outstanding plus this payment's amount.
  const editingBillId = editing?.billId;
  const roomOf = (b: BillStatusInfo): number =>
    round2(b.outstanding + (editing && editingBillId === b.billId ? editing.amount : 0));

  const billChoices = sortOldestFirst(
    Object.values(billStatuses)
      .map((b) => ({ ...b, room: roomOf(b) }))
      .filter((b) => b.room > 0)
  );
  const openBills = billChoices.map((b) => ({
    billId: b.billId,
    billNo: b.billNo,
    billDate: b.billDate,
    outstanding: b.room,
  }));
  const canAutoApply = isReceived && !editing && openBills.length > 0;

  const [amount, setAmount] = useState(() => (editing ? String(editing.amount) : ""));
  const [date, setDate] = useState(() => (editing ? editing.date.slice(0, 10) : todayInput()));
  const [mode, setMode] = useState<PaymentMode>(() => {
    const m = metaText(editing, "mode");
    return (PAYMENT_MODES as readonly string[]).includes(m) ? (m as PaymentMode) : isReceived ? "Cash" : "Other";
  });
  const [reference, setReference] = useState(() => metaText(editing, "reference"));
  const [remark, setRemark] = useState(() => metaText(editing, "remark"));
  const [apply, setApply] = useState<Apply>(() => {
    if (!isReceived) return "none";
    if (editing) return editing.billId ? "bill" : "none";
    if (presetBillId) return "bill";
    return openBills.length > 0 ? "auto" : "none";
  });
  const [billId, setBillId] = useState(() => (editing?.billId ?? presetBillId ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amountNum = Number(amount);
  const amountOk = Number.isFinite(amountNum) && amountNum > 0;
  const chosen = billChoices.find((b) => b.billId === billId);
  const totalDue = round2(openBills.reduce((s, b) => s + b.outstanding, 0));
  const plan = apply === "auto" && amountOk ? planAllocation(openBills, amountNum) : null;

  // Live problem with the bill choice (shown while typing, blocks saving).
  let billProblem = "";
  if (isReceived && apply === "bill") {
    if (!chosen) billProblem = billId ? "That bill has nothing left to pay." : "Choose a bill, or record it without one.";
    else if (amountOk && Math.round(amountNum * 100) > Math.round(chosen.room * 100)) {
      billProblem = `This bill has only ${formatInr(chosen.room)} outstanding. Lower the amount, or use auto-apply to keep the extra as an advance.`;
    }
  }

  // Net balance after saving. Editing first undoes the old amount.
  const base = editing ? (editing.side === "received" ? netBalance + editing.amount : netBalance - editing.amount) : netBalance;
  const netAfter = amountOk ? round2(base + (isReceived ? -amountNum : amountNum)) : null;

  const title = editing
    ? isReceived ? "Edit payment" : "Edit receivable entry"
    : isReceived ? "Received (Credit)" : "Receivable (Debit)";

  const fillAmount = () => {
    const v = apply === "bill" && chosen ? chosen.room : apply === "auto" ? totalDue : 0;
    if (v > 0) setAmount(String(v));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    if (!amountOk) return setError("Enter an amount greater than 0.");
    if (!date) return setError("Pick a date.");
    if (billProblem) return setError(billProblem);

    const fields: PaymentFields = {
      amount: round2(amountNum),
      date,
      mode,
      reference: reference.trim(),
      remark: remark.trim(),
    };
    setSaving(true);
    setError("");
    try {
      let message: string;
      if (editing) {
        message = (
          await dispatch(updatePayment({ ...fields, _id: editing.sourceId, billId: apply === "bill" ? billId : null })).unwrap()
        ).message;
      } else if (!isReceived) {
        message = (await dispatch(createPayment({ ...fields, partyId: customerId, direction })).unwrap()).message;
      } else if (apply === "auto") {
        const r = await dispatch(allocatePayment({ ...fields, partyId: customerId })).unwrap();
        const bills = r.allocations.map((a) => a.billNo).join(", ");
        message = r.allocations.length
          ? `Applied to ${bills}${r.unapplied > 0 ? `; ${formatInr(r.unapplied)} kept as advance` : ""}.`
          : "Payment recorded as an advance.";
      } else {
        message = (
          await dispatch(
            createPayment({ ...fields, partyId: customerId, direction, billId: apply === "bill" ? billId : null })
          ).unwrap()
        ).message;
      }
      onSaved(message);
    } catch (err) {
      setError(typeof err === "string" ? err : "Couldn't save this payment. Please try again.");
      setSaving(false);
    }
  };

  const radio = (value: Apply, text: string, hint?: string) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition",
        apply === value ? "border-(--ledger-edge) bg-(--ledger-accent-soft)" : "border-(--ledger-line) hover:bg-(--ledger-surface)"
      )}
    >
      <input type="radio" name="apply" className="mt-0.5" checked={apply === value} onChange={() => setApply(value)} />
      <span>
        <span className="font-medium">{text}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
    </label>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" initialFocus={amountRef}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isReceived ? "bg-(--received-soft) text-(--received)" : "bg-(--receivable-soft) text-(--receivable)"
              )}
            >
              {isReceived ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </span>
            <div className="text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {customerName}
                {!isReceived && !editing && " · an amount owed that is not on a bill"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[1fr_9.5rem] gap-3">
            <label className={label}>
              Amount
              <span className="relative mt-1 block">
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-400">₹</span>
                <input
                  ref={amountRef}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={cn(field, "h-12 pl-8 text-xl font-semibold tabular-nums")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={amount !== "" && !amountOk}
                  placeholder="0"
                />
              </span>
            </label>
            <label className={label}>
              Date
              <input type="date" className={cn(field, "mt-1 h-12")} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          {isReceived && (editing || openBills.length > 0) && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">Apply to</legend>
              {canAutoApply && radio("auto", "Oldest invoices first", "Spreads the amount across open bills; any extra stays as an advance.")}
              {(openBills.length > 0 || editing) && radio("bill", "One bill")}
              {apply === "bill" && (
                <select
                  className={field}
                  value={billId}
                  onChange={(e) => setBillId(e.target.value)}
                  aria-label="Bill"
                  aria-invalid={Boolean(billProblem)}
                >
                  <option value="">Select a bill…</option>
                  {billChoices.map((b) => (
                    <option key={b.billId} value={b.billId}>
                      Invoice {b.billNo} · {formatLedgerDate(b.billDate)} · due {formatInr(b.room)}
                    </option>
                  ))}
                </select>
              )}
              {radio("none", "No bill", "Kept as an advance on the customer's account.")}

              {(apply === "auto" || (apply === "bill" && chosen)) && (
                <button type="button" onClick={fillAmount} className="text-xs font-medium text-(--ledger-edge) hover:underline">
                  Fill {apply === "auto" ? `total due (${formatInr(totalDue)})` : `bill due (${formatInr(chosen?.room ?? 0)})`}
                </button>
              )}
            </fieldset>
          )}

          {plan && (
            <div aria-live="polite" className="space-y-1 rounded-lg bg-(--ledger-surface) p-3 text-xs">
              {plan.allocations.map((a) => (
                <p key={a.billId} className="flex justify-between">
                  <span>Invoice {a.billNo}</span>
                  <span className="font-semibold tabular-nums text-(--received)">{formatInr(a.amount)}</span>
                </p>
              ))}
              {plan.unapplied > 0 && (
                <p className="flex justify-between">
                  <span>Advance (no open invoice left)</span>
                  <span className="font-semibold tabular-nums text-(--received)">{formatInr(plan.unapplied)}</span>
                </p>
              )}
            </div>
          )}

          {isReceived && (
            <>
              <div role="group" aria-label="Payment mode" className="flex flex-wrap gap-1.5">
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      mode === m
                        ? "border-(--ledger-edge) bg-(--ledger-accent-soft) text-(--ledger-edge)"
                        : "border-(--ledger-line) text-neutral-600 hover:bg-(--ledger-surface) dark:text-neutral-300"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <label className={label}>
                UTR / cheque no.
                <input className={cn(field, "mt-1")} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
              </label>
            </>
          )}

          <label className={label}>
            {isReceived ? "Remark" : "Reason / remark"}
            <input className={cn(field, "mt-1")} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} />
          </label>

          {netAfter !== null && (
            <div aria-live="polite" className="flex items-center justify-between rounded-xl bg-(--ledger-surface) px-3 py-2.5 text-xs">
              <span>
                <span className="block text-neutral-500">Now</span>
                <b className="text-sm">{describeNet(netBalance)}</b>
              </span>
              <span aria-hidden="true" className="text-neutral-400">→</span>
              <span className="text-right">
                <span className="block text-neutral-500">After saving</span>
                <b className={cn("text-sm", netAfter > 0 ? "text-(--receivable)" : "text-(--received)")}>{describeNet(netAfter)}</b>
              </span>
            </div>
          )}

          {(billProblem || error) && (
            <p role="alert" className="rounded-lg bg-(--receivable-soft) px-3 py-2 text-xs font-medium text-(--receivable)">
              {error || billProblem}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} disabled={Boolean(billProblem)}>
              {editing ? "Save changes" : isReceived ? "Save payment" : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
