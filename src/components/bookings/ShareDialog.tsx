"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { Download, FileText, Loader2, Truck, UserRound, UserRoundCheck, X } from "lucide-react";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import { downloadLrPdf } from "@/lib/api/lr-download";
import { LR_STANDARD_COPIES, type LrCopyKey } from "@/lib/lr-copies";

type Option = { key: LrCopyKey | "all"; label: string; icon: ReactNode };

const OPTIONS: Option[] = [
  { key: "lorry", label: "Lorry Copy", icon: <Truck /> },
  { key: "consignee", label: "Consignee Copy", icon: <UserRoundCheck /> },
  { key: "consignor", label: "Consignor Copy", icon: <UserRound /> },
  { key: "file", label: "File Copy", icon: <FileText /> },
  { key: "all", label: "Download All", icon: <Download /> },
];

/** Share → pick a copy → its PDF downloads. "Download All" is one PDF with every copy. */
export function ShareDialog({ row, onClose }: { row: ConsignmentListItem | null; onClose: () => void }) {
  if (!row) return null;
  return <ShareOptions key={row._id} row={row} onClose={onClose} />;
}

function ShareOptions({ row, onClose }: { row: ConsignmentListItem; onClose: () => void }) {
  const [busyKey, setBusyKey] = useState<Option["key"] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async (key: Option["key"]) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await downloadLrPdf(row._id, key === "all" ? LR_STANDARD_COPIES : key);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the PDF.");
      setBusyKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share LR ${row.consignmentNumber}`}
        className="relative w-full max-w-xs rounded-2xl bg-neutral-50 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-4 text-center text-body-sm font-semibold text-neutral-700">
          LR {row.consignmentNumber}
        </p>

        <div className="flex flex-col gap-4">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              disabled={busyKey !== null}
              onClick={() => void download(o.key)}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-body-md font-medium text-slate-700 shadow-md transition hover:shadow-lg disabled:cursor-wait disabled:opacity-60 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:text-slate-400"
            >
              {busyKey === o.key ? <Loader2 className="animate-spin" aria-hidden="true" /> : o.icon}
              {busyKey === o.key ? "Preparing PDF…" : o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
