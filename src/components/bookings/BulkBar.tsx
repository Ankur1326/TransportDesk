"use client";

import { Download, PackageCheck, Truck, X } from "lucide-react";
import { Button } from "@/components/Button";

export function BulkBar({
  count, busy, onOnRoute, onDelivered, onExport, onClear,
}: {
  count: number; busy: boolean;
  onOnRoute: () => void; onDelivered: () => void; onExport: () => void; onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="sticky bottom-3 z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-lg"
    >
      <span className="text-body-sm font-semibold text-neutral-800">{count} selected</span>
      <Button size="sm" variant="outline" disabled={busy} onClick={onOnRoute}>
        <Truck className="h-4 w-4" aria-hidden="true" /> On Route
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={onDelivered}>
        <PackageCheck className="h-4 w-4" aria-hidden="true" /> Delivered
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={onExport}>
        <Download className="h-4 w-4" aria-hidden="true" /> CSV
      </Button>
      <button type="button" onClick={onClear} aria-label="Clear selection"
        className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
