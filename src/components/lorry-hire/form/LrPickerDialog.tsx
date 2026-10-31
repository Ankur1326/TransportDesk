"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listConsignments, type ConsignmentListItem } from "@/lib/api/consignments";
import type { LorryHireItemValues } from "@/lib/lorry-hire/validations";

const day = (v: unknown): string => {
  const raw = typeof v === "object" && v && "$date" in v ? (v as { $date: string }).$date : v;
  return typeof raw === "string" ? raw.slice(0, 10) : "";
};
const num = (v?: string): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function lrToItem(lr: ConsignmentListItem): LorryHireItemValues {
  return {
    consignmentId: lr._id,
    cnNo: lr.consignmentNumber,
    cnDate: day(lr.bookingDate ?? lr.cnsDate),
    from: lr.from?.location ?? "",
    to: lr.to?.location ?? "",
    description: lr.shipment?.description ?? "",
    packages: num(lr.shipment?.packages),
    actualWeight: num(lr.shipment?.actualWeight),
    chargedWeight: num(lr.shipment?.chargeWeight),
  };
}

/** Pick LRs to carry on the contract. LRs already on the form are hidden. */
export function LrPickerDialog({
  open,
  onClose,
  existingIds,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  existingIds: string[];
  onAdd: (items: LorryHireItemValues[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ConsignmentListItem[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Record<string, ConsignmentListItem>>({});

  const loading = open && loadedFor !== search;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      listConsignments({ search: search.trim() || undefined, limit: 20, sort: "newest" })
        .then((res) => {
          if (!cancelled) {
            setRows(res.data);
            setError("");
          }
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load LRs.");
        })
        .finally(() => {
          if (!cancelled) setLoadedFor(search);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  const visible = rows.filter((r) => r.status !== "Cancelled" && !existingIds.includes(r._id));
  const chosen = Object.values(picked);

  const close = () => {
    setPicked({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add cargo from LRs</DialogTitle>
          <DialogDescription>Search by LR number, party or vehicle, then tick the LRs on this truck.</DialogDescription>
        </DialogHeader>

        <Input placeholder="Search LR…" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="max-h-72 overflow-y-auto border border-neutral-200">
          {error && <p className="p-3 text-body-sm text-error-700">{error}</p>}
          {!error && loading && <p className="p-3 text-body-sm text-neutral-500">Loading…</p>}
          {!error && !loading && visible.length === 0 && (
            <p className="p-3 text-body-sm text-neutral-500">No LRs found.</p>
          )}
          {visible.map((lr) => {
            const linked = (lr as unknown as { lorryHire?: { lhcNo?: string } }).lorryHire?.lhcNo;
            const checked = !!picked[lr._id];
            return (
              <label key={lr._id} className="flex cursor-pointer items-start gap-3 border-b border-neutral-100 px-3 py-2 last:border-0 hover:bg-neutral-50">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={() =>
                    setPicked((p) => {
                      const next = { ...p };
                      if (checked) delete next[lr._id];
                      else next[lr._id] = lr;
                      return next;
                    })
                  }
                />
                <span className="min-w-0 flex-1 text-body-sm">
                  <span className="font-medium text-neutral-900">{lr.consignmentNumber}</span>
                  <span className="text-neutral-500"> · {lr.from?.location ?? "—"} → {lr.to?.location ?? "—"}</span>
                  <span className="block truncate text-caption text-neutral-500">
                    {[lr.consignor?.name, lr.shipment?.description].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {linked && <Badge variant="warning">On {linked}</Badge>}
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => {
              onAdd(chosen.map(lrToItem));
              close();
            }}
          >
            Add {chosen.length > 0 ? `${chosen.length} LR${chosen.length > 1 ? "s" : ""}` : "LRs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
