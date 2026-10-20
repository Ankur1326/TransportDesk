"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "@/components/icons";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { listPartyConsignments, type ConsignmentListItem } from "@/lib/bill/api";
import formatDate from "@/lib/formateDate";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { SectionCard, inr } from "@/components/bills/create/ui";

interface PartyBiltyPickerProps {
  partyName: string;
  /** consignmentIds already on the bill, in the order they were added (index + 1 = SR NO). */
  selectedIds: string[];
  busy: boolean;
  onAdd: (items: ConsignmentListItem[]) => void;
  onRemoveId: (consignmentId: string) => void;
}

const norm = (v?: string) => (v ?? "").trim().toLowerCase();

function roleOf(c: ConsignmentListItem, party: string): "Consignor" | "Consignee" | "Both" {
  const isOr = norm(c.consignor?.name) === norm(party);
  const isEe = norm(c.consignee?.name) === norm(party);
  return isOr && isEe ? "Both" : isOr ? "Consignor" : "Consignee";
}

function dateOf(c: ConsignmentListItem) {
  const v = c.bookingDate || c.cnsDate;
  return v ? formatDate(String(v)) : "—";
}

/**
 * Lists every unbilled LR where the chosen customer is the consignor OR the
 * consignee. Ticking a row adds it to the bill (SR NO follows the order of
 * selection); unticking removes it and the remaining rows renumber.
 */
export function PartyBiltyPicker({ partyName, selectedIds, busy, onAdd, onRemoveId }: PartyBiltyPickerProps) {
  const [items, setItems] = useState<ConsignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    // The parent remounts this component per party (key), so `loading` starts true.
    let cancelled = false;
    listPartyConsignments(partyName)
      .then((list) => !cancelled && setItems(list))
      .catch((error) => {
        if (cancelled) return;
        toast.error(getApiErrorMessage(error, "Couldn't load this customer's bilties."));
        setItems([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [partyName]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.consignmentNumber, c.from?.location, c.to?.location, c.vehicleNumber].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [items, filter]);

  const unselectedVisible = visible.filter((c) => !selectedIds.includes(c._id));
  const allVisibleSelected = visible.length > 0 && unselectedVisible.length === 0;

  return (
    <SectionCard
      title="Select Bilties (LR)"
      action={
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
          {selectedIds.length} selected
        </span>
      }
    >
      <p className="mb-3 text-xs text-slate-500">
        Showing unbilled LRs where <strong className="text-slate-700">{partyName}</strong> is the consignor or the consignee. Tick one or more —
        charges fill in automatically and SR NO follows the order you select.
      </p>

      <div className="mb-3 sm:max-w-xs">
        <Input
          size="compact"
          label="Filter bilties"
          hi="बिल्टी खोजें"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="LR no., route or vehicle…"
        />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading bilties…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
          No unbilled LRs found for {partyName}.
        </p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all shown bilties"
                    checked={allVisibleSelected}
                    disabled={busy || visible.length === 0}
                    onChange={() => (allVisibleSelected ? visible.forEach((c) => onRemoveId(c._id)) : onAdd(unselectedVisible))}
                    className="focus-ring h-4 w-4 accent-brand-700"
                  />
                </th>
                <th className="px-3 py-2">SR</th>
                <th className="px-3 py-2">LR No</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Party as</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2 text-right">Freight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((c) => {
                const order = selectedIds.indexOf(c._id);
                const checked = order >= 0;
                const role = roleOf(c, partyName);
                return (
                  <tr key={c._id} className={cn(checked && "bg-brand-50/60")}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select LR ${c.consignmentNumber}`}
                        checked={checked}
                        disabled={busy}
                        onChange={() => (checked ? onRemoveId(c._id) : onAdd([c]))}
                        className="focus-ring h-4 w-4 accent-brand-700"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-brand-700">{checked ? order + 1 : ""}</td>
                    <td className="px-3 py-2 font-semibold">{c.consignmentNumber}</td>
                    <td className="px-3 py-2 text-slate-600">{dateOf(c)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {c.from?.location || "—"} → {c.to?.location || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          role === "Consignor" ? "bg-info-50 text-info-700" : role === "Consignee" ? "bg-warning-50 text-warning-700" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{c.vehicleNumber || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.charges?.freight != null ? inr(Number(c.charges.freight) || 0) : "—"}</td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No bilties match “{filter}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
