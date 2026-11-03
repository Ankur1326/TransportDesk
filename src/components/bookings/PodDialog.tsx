"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import type { PodStatusRequest } from "@/lib/api/consignmentActions";
import { POD_NOTE_MAX, POD_SUBMITTED_TO_MAX } from "@/lib/pod-status";

export type PodDialogTarget = { row: ConsignmentListItem; mode: "receive" | "submit" } | null;

type Props = {
  target: PodDialogTarget;
  onClose: () => void;
  onConfirm: (row: ConsignmentListItem, body: PodStatusRequest) => Promise<void>;
};

/** Today as YYYY-MM-DD in the browser's time zone (toISOString would give the UTC day). */
function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function PodDialog({ target, onClose, onConfirm }: Props) {
  if (!target) return null;
  return <PodForm key={`${target.row._id}:${target.mode}`} target={target} onClose={onClose} onConfirm={onConfirm} />;
}

function PodForm({ target, onClose, onConfirm }: Props & { target: NonNullable<PodDialogTarget> }) {
  const { row, mode } = target;
  const hasFile = Boolean(row.podUrl);
  const [remark, setRemark] = useState("");
  const [date, setDate] = useState(today);
  const [to, setTo] = useState(row.podSubmittedTo ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    let body: PodStatusRequest;
    if (mode === "receive") {
      if (!hasFile && !remark.trim()) {
        setError("Add a remark — there is no POD file to go with this.");
        return;
      }
      body = { action: "receive", remark: remark.trim() || undefined };
    } else {
      if (!date) {
        setError("Choose the date the POD was submitted.");
        return;
      }
      body = { action: "submit", submittedAt: date, submittedTo: to.trim() || undefined, note: remark.trim() || undefined };
    }
    setBusy(true);
    try {
      await onConfirm(row, body);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="POD status" className="max-h-full w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-h4 font-semibold text-neutral-900">
          {mode === "receive" ? "Mark POD received" : "Mark POD submitted"} · LR {row.consignmentNumber}
        </h2>
        <p className="mt-1 text-body-sm text-neutral-600">
          {mode === "receive"
            ? hasFile
              ? "A POD file is attached, so a remark is optional."
              : "No POD file is attached. Say where the POD is (e.g. hard copy with the driver)."
            : "Record when and to whom the POD was handed over for billing."}
        </p>

        <div className="mt-3 space-y-3">
          {mode === "submit" && (
            <>
              <Input type="date" label="Submitted on" value={date} max={today()} onChange={(e) => { setDate(e.target.value); setError(""); }} />
              <Input label="Submitted to (optional)" value={to} maxLength={POD_SUBMITTED_TO_MAX}
                placeholder="e.g. Tata Motors accounts" onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <Textarea
            label={mode === "receive" ? (hasFile ? "Remark (optional)" : "Remark") : "Note (optional)"}
            rows={3}
            maxLength={POD_NOTE_MAX}
            value={remark}
            error={error && mode === "receive" ? error : undefined}
            placeholder={mode === "receive" ? "e.g. Hard copy received at office" : "e.g. Sent by courier, AWB 12345"}
            onChange={(e) => { setRemark(e.target.value); setError(""); }}
          />
          {error && mode === "submit" && <p role="alert" className="text-body-sm text-error-600">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" isLoading={busy} onClick={() => void submit()}>
            {mode === "receive" ? "Mark received" : "Mark submitted"}
          </Button>
        </div>
      </div>
    </div>
  );
}
