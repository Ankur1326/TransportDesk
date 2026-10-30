"use client";
import { useState } from "react";
import ReportTable from "@/components/lorry-hire/ReportTable";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import FormInput from "@/components/FormInput";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import type { TripProfitRow, TripProfitTotals } from "@/lib/lorry-hire/fleet-reports";

const HEADINGS = ["LHC", "Date", "Route", "Vehicle", "Supplier", "LR Freight", "Hire Cost", "Profit", "Margin"];

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone ?? "text-neutral-900"}`}>{value}</p>
    </Card>
  );
}

const signed = (n: number) => `${n < 0 ? "−" : ""}${formatInr(n)}`;

export default function TripProfitPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <ReportTable<TripProfitRow, TripProfitTotals>
      endpoint="/api/admin/lorry-hires/profit"
      headings={HEADINGS}
      extraParams={{ from: from || undefined, to: to ? `${to}T23:59:59` : undefined }}
      header={({ summary }) => (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <FormInput label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <FormInput label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Stat label="Trips" value={String(summary?.trips ?? 0)} />
            <Stat label="LR freight earned" value={formatInr(summary?.revenue ?? 0)} />
            <Stat label="Hire cost" value={formatInr(summary?.cost ?? 0)} />
            <Stat
              label={`Profit${summary?.marginPct != null ? ` · ${summary.marginPct}%` : ""}`}
              value={signed(summary?.profit ?? 0)}
              tone={(summary?.profit ?? 0) < 0 ? "text-error-700" : "text-success-700"}
            />
            {(summary?.lossTrips ?? 0) > 0 && <Stat label="Loss-making trips" value={String(summary?.lossTrips)} tone="text-error-700" />}
          </div>
        </>
      )}
      renderCell={(r, key) => {
        switch (key) {
          case "LHC":
            return (
              <span className="font-medium">
                {r.lhcNo}
                {r.unlinkedItems > 0 && (
                  <Badge variant="warning" className="ml-2" title="Some cargo rows aren't linked to an LR, so freight may be understated.">
                    {r.unlinkedItems} unlinked
                  </Badge>
                )}
              </span>
            );
          case "Date":
            return <span className="text-sm">{formatLedgerDate(r.lhcDate)}</span>;
          case "Route":
            return <span className="text-sm">{r.route || "—"}</span>;
          case "Vehicle":
            return <span className="text-sm">{r.vehicleNumber ? formatVehicleNumber(r.vehicleNumber) : "—"}</span>;
          case "Supplier":
            return <span className="text-sm">{r.supplierName}</span>;
          case "LR Freight":
            return <span className="text-sm">{formatInr(r.revenue)}</span>;
          case "Hire Cost":
            return <span className="text-sm">{formatInr(r.cost)}</span>;
          case "Profit":
            return (
              <span className={`text-sm font-semibold ${r.profit < 0 ? "text-error-700" : "text-success-700"}`}>
                {signed(r.profit)}
              </span>
            );
          case "Margin":
            return <span className="text-sm">{r.marginPct == null ? "—" : `${r.marginPct}%`}</span>;
          default:
            return null;
        }
      }}
    />
  );
}
