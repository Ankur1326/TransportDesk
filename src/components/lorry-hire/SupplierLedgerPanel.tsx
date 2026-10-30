"use client";
import { useEffect, useState } from "react";
import { EditOrCreateNewModalWrapper } from "@/components/EditOrCreateNewModalWrapper";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import FormInput from "@/components/FormInput";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import type { SupplierAgeingBucket, SupplierContractStatus, SupplierLedgerEntry } from "@/lib/lorry-hire/supplier-ledger";

interface LedgerResponse {
  success: boolean;
  message?: string;
  supplier: { name: string; mobile: string | null; gstin: string };
  summary: { totalPayable: number; totalPaid: number; balance: number };
  ageing: SupplierAgeingBucket[];
  contracts: SupplierContractStatus[];
  entries: SupplierLedgerEntry[];
  totalEntries: number;
  totalPages: number;
}

type Filter = "all" | "payable" | "paid";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "payable", label: "Hires" },
  { key: "paid", label: "Payments" },
];

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="flex-1 min-w-[130px]">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone ?? "text-neutral-900"}`}>{value}</p>
    </Card>
  );
}

export default function SupplierLedgerPanel({
  supplierId,
  supplierName,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const key = `${supplierId}|${filter}|${from}|${to}|${page}|${retry}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ type: filter, currentPage: String(page), itemsPerPage: "25" });
    if (from) qs.set("from", from);
    if (to) qs.set("to", `${to}T23:59:59`);
    fetch(`/api/admin/supplier/ledger/${supplierId}?${qs}`)
      .then(async (res) => {
        const json = (await res.json()) as LedgerResponse;
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load ledger.");
        if (!cancelled) { setData(json); setError(null); }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load ledger.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(key);
      });
    return () => { cancelled = true; };
  }, [supplierId, filter, from, to, page, key]);

  const balance = data?.summary.balance ?? 0;

  return (
    <EditOrCreateNewModalWrapper
      isVisible
      onClose={onClose}
      title={`Ledger · ${supplierName}`}
      size="very_large"
      hideDefaultButtons
    >
      <div className="space-y-4">
        {error && <ApiErrorState error={{ kind: "other", title: "Couldn't load ledger", message: error }} onRetry={() => setRetry((r) => r + 1)} />}

        <div className="flex flex-wrap gap-3">
          <Stat label="Total hire payable" value={formatInr(data?.summary.totalPayable ?? 0)} />
          <Stat label="Total paid" value={formatInr(data?.summary.totalPaid ?? 0)} tone="text-success-700" />
          <Stat
            label={balance >= 0 ? "We owe supplier" : "Supplier owes us (advance)"}
            value={formatInr(balance)}
            tone={balance > 0 ? "text-error-700" : "text-success-700"}
          />
        </div>

        {data && data.ageing.some((b) => b.amount > 0) && (
          <div className="flex flex-wrap gap-2">
            {data.ageing.map((b) => (
              <Badge key={b.key} variant={b.amount > 0 ? (b.key === "90+" ? "error" : "warning") : "neutral"}>
                {b.label}: {formatInr(b.amount)}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`rounded-full px-3 py-1 text-sm ${
                  filter === f.key ? "bg-brand-100 text-brand-800" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <FormInput label="From" type="date" value={from} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFrom(e.target.value); setPage(1); }} />
          <FormInput label="To" type="date" value={to} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setTo(e.target.value); setPage(1); }} />
        </div>

        <div className="overflow-x-auto border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Details</th>
                <th className="p-2 text-right">Hire (Cr)</th>
                <th className="p-2 text-right">Paid (Dr)</th>
                <th className="p-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-4 text-center text-neutral-500">Loading…</td></tr>
              )}
              {!loading && data?.entries.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-neutral-500">No entries for this filter.</td></tr>
              )}
              {!loading && data?.entries.map((e) => (
                <tr key={e.id} className="border-t border-neutral-100">
                  <td className="p-2 whitespace-nowrap">{formatLedgerDate(e.date)}</td>
                  <td className="p-2">
                    {e.lhcNo && <span className="font-medium">{e.lhcNo} </span>}
                    <span className="text-neutral-600">{e.label}</span>
                    {e.mode && <span className="text-xs text-neutral-400"> · {e.mode}{e.reference ? ` ${e.reference}` : ""}</span>}
                  </td>
                  <td className="p-2 text-right">{e.payable ? formatInr(e.payable) : ""}</td>
                  <td className="p-2 text-right text-success-700">{e.paid ? formatInr(e.paid) : ""}</td>
                  <td className="p-2 text-right font-medium">
                    {formatInr(e.balance)} <span className="text-xs text-neutral-400">{e.balance >= 0 ? "Cr" : "Dr"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 disabled:opacity-40">Previous</button>
            <span>Page {page} of {data.totalPages}</span>
            <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </EditOrCreateNewModalWrapper>
  );
}
