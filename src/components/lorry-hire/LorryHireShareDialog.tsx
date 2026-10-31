"use client";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { ClipboardCopy, Download, Link2, MessageCircle, X } from "lucide-react";
import type { LorryHireRecord } from "@/lib/lorry-hire/api";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import { lorryHirePdfPath } from "@/lib/lorry-hire/pdf-url";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ymd = (v?: string) => (v && /^(\d{4})-(\d{2})-(\d{2})/.test(v) ? v.slice(0, 10).split("-").reverse().join("-") : "");

const absolutePdfUrl = (r: LorryHireRecord) => `${window.location.origin}${lorryHirePdfPath(r._id)}`;

const summaryText = (r: LorryHireRecord, link?: string) =>
  [
    `Lorry Hire Contract ${r.lhcNo}${r.lhcDate ? ` · ${ymd(r.lhcDate)}` : ""}`,
    `Truck: ${formatVehicleNumber(r.truck.vehicleNumber)}`,
    `Route: ${r.from.location} → ${r.to.location}`,
    `Supplier: ${r.supplier.name}`,
    `Net payable: ${inr(r.settlement.netPayable)} · Balance: ${inr(r.settlement.balance)}`,
    link ? `PDF: ${link}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const copyText = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("Couldn't copy — your browser blocked it.");
  }
};

type Option = { key: string; label: string; icon: ReactNode; run: (r: LorryHireRecord) => void };

const OPTIONS: Option[] = [
  {
    key: "download",
    label: "Download PDF",
    icon: <Download />,
    run: (r) => {
      const a = document.createElement("a");
      a.href = lorryHirePdfPath(r._id, { download: true });
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
  },
  {
    key: "whatsapp",
    label: "Share on WhatsApp",
    icon: <MessageCircle />,
    run: (r) => window.open(`https://wa.me/?text=${encodeURIComponent(summaryText(r, absolutePdfUrl(r)))}`, "_blank", "noopener"),
  },
  { key: "link", label: "Copy PDF link", icon: <Link2 />, run: (r) => void copyText(absolutePdfUrl(r), "Link copied.") },
  { key: "details", label: "Copy details", icon: <ClipboardCopy />, run: (r) => void copyText(summaryText(r), "Details copied.") },
];

/** Share → pick how: download the PDF, WhatsApp, or copy the link / details. */
export function LorryHireShareDialog({ record, onClose }: { record: LorryHireRecord | null; onClose: () => void }) {
  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [record, onClose]);

  const [busy, setBusy] = useState<string | null>(null);
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${record.lhcNo}`}
        className="relative w-full max-w-xs rounded-2xl bg-neutral-50 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200">
          <X className="h-4 w-4" />
        </button>
        <p className="mb-4 text-center text-body-sm font-semibold text-neutral-700">{record.lhcNo}</p>
        <div className="flex flex-col gap-3">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setBusy(o.key);
                o.run(record);
                onClose();
              }}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-body-md font-medium text-slate-700 shadow-md transition hover:shadow-lg disabled:opacity-60 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-400"
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
