"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import type { ConsignmentPatch } from "@/lib/api/consignmentActions";
import { formatINR, lrTotal, suggestPaymentStatus } from "@/lib/lr-helpers";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
];
const MODE_OPTIONS = [
  { value: "", label: "Select mode" },
  { value: "Cash", label: "Cash" },
  { value: "NEFT", label: "NEFT" },
  { value: "Check", label: "Cheque" },
];

const toDay = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "");

type Props = {
  row: ConsignmentListItem | null;
  onClose: () => void;
  onSave: (patch: ConsignmentPatch) => Promise<void>;
};

/** Mounts a fresh form per LR, so the fields always start from that LR's saved values. */
export function AccountModal({ row, onClose, onSave }: Props) {
  if (!row) return null;
  return <AccountForm key={row._id} row={row} onClose={onClose} onSave={onSave} />;
}

function AccountForm({ row, onClose, onSave }: Props & { row: ConsignmentListItem }) {
  const p = row.payment ?? {};
  const [status, setStatus] = useState(p.status && p.status !== "Cancelled" ? p.status : "Pending");
  const [amount, setAmount] = useState(p.receivedMoney ?? "");
  const [date, setDate] = useState(toDay(p.receivedDate));
  const [mode, setMode] = useState(p.receivedType ?? "");
  const [utr, setUtr] = useState(p.UTRNumber ?? "");
  const [mrNo, setMrNo] = useState(p.mrNumber ?? "");
  const [mrDate, setMrDate] = useState(toDay(p.mrDate));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = lrTotal(row);
  const received = Math.max(0, parseFloat(amount) || 0);
  const balance = status === "Paid" ? 0 : Math.max(0, total - received);

  const onAmountChange = (value: string) => {
    setAmount(value);
    setError("");
    const n = parseFloat(value);
    if (Number.isFinite(n)) setStatus(suggestPaymentStatus(total, n));
  };

  const submit = async () => {
    if (amount.trim() !== "" && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        "payment.status": status as ConsignmentPatch["payment.status"],
        "payment.receivedMoney": amount.trim(),
        "payment.receivedDate": date,
        "payment.receivedType": mode as ConsignmentPatch["payment.receivedType"],
        "payment.UTRNumber": utr.trim(),
        "payment.mrNumber": mrNo.trim(),
        "payment.mrDate": mrDate,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Account for LR ${row.consignmentNumber}`}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-h4 font-semibold text-neutral-900">Account · LR {row.consignmentNumber}</h2>
        <p className="mt-0.5 text-body-sm text-neutral-500">
          {row.consignor?.name || "—"} → {row.consignee?.name || "—"} · {row.payment?.type || "—"}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 p-3 text-center">
          <div><p className="text-[11px] uppercase text-neutral-500">Total</p><p className="font-semibold">{formatINR(total)}</p></div>
          <div><p className="text-[11px] uppercase text-neutral-500">Received</p><p className="font-semibold text-green-700">{formatINR(received)}</p></div>
          <div><p className="text-[11px] uppercase text-neutral-500">Balance</p><p className={`font-semibold ${balance > 0 ? "text-red-600" : "text-neutral-900"}`}>{formatINR(balance)}</p></div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select label="Payment status" options={STATUS_OPTIONS} value={status}
            onChange={(e) => setStatus(e.target.value)} />
          <Input label="Amount received (₹)" inputMode="decimal" value={amount} error={error}
            onChange={(e) => onAmountChange(e.target.value)} />
          <Input label="Received on" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Mode" options={MODE_OPTIONS} value={mode} onChange={(e) => setMode(e.target.value)} />
          <Input label="UTR / Cheque no" value={utr} maxLength={60} onChange={(e) => setUtr(e.target.value)} />
          <Input label="MR number" value={mrNo} maxLength={60} onChange={(e) => setMrNo(e.target.value)} />
          <Input label="MR date" type="date" value={mrDate} onChange={(e) => setMrDate(e.target.value)} />
        </div>

        {received > total && total > 0 && (
          <p className="mt-2 text-body-sm text-amber-700">Received amount is more than the LR total.</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" isLoading={saving} onClick={submit}>Save</Button>
        </div>
      </div>
    </div>
  );
}
