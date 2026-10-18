"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import type { ConsignmentListItem } from "@/lib/api/consignments";

type Props = {
  row: ConsignmentListItem | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function CancelDialog({ row, onClose, onConfirm }: Props) {
  if (!row) return null;
  return <CancelForm key={row._id} row={row} onClose={onClose} onConfirm={onConfirm} />;
}

function CancelForm({ row, onClose, onConfirm }: Props & { row: ConsignmentListItem }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-h4 font-semibold text-neutral-900">Cancel LR {row.consignmentNumber}?</h2>
        <p className="mt-1 text-body-sm text-neutral-600">
          A cancelled LR can&apos;t be edited or reopened.
        </p>
        <label htmlFor="cancel-reason" className="mt-3 block text-body-sm font-medium text-neutral-700">
          Reason <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <textarea
          id="cancel-reason"
          autoFocus
          rows={3}
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 text-body-sm outline-none focus:border-brand-600"
          placeholder="e.g. Wrong consignee, goods not loaded"
        />
        <p className="text-right text-[11px] text-neutral-400">{reason.length}/200</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Keep LR</Button>
          <Button variant="danger" size="sm" isLoading={busy}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(reason.trim()); } finally { setBusy(false); }
            }}>
            Cancel LR
          </Button>
        </div>
      </div>
    </div>
  );
}
