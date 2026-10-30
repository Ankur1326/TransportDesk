"use client";
import ReportTable from "@/components/lorry-hire/ReportTable";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import type { VehicleSummary } from "@/lib/lorry-hire/fleet-reports";

const HEADINGS = ["Vehicle", "Type", "Trips", "Total Hire", "Last Hired", "Last Driver", "Owner", "Suppliers"];

const cell = "whitespace-normal break-words text-sm text-gray-900 dark:text-gray-200";

export default function VehiclesPage() {
  return (
    <ReportTable<VehicleSummary>
      endpoint="/api/admin/lorry-hires/vehicles"
      headings={HEADINGS}
      renderCell={(v, key) => {
        switch (key) {
          case "Vehicle":
            return <span className="font-semibold tracking-wide">{formatVehicleNumber(v.vehicleNumber)}</span>;
          case "Type":
            return <span className={cell}>{v.truckType || "—"}</span>;
          case "Trips":
            return <span className={cell}>{v.trips}</span>;
          case "Total Hire":
            return <span className={cell}>{formatInr(v.totalHire)}</span>;
          case "Last Hired":
            return <span className={cell}>{formatLedgerDate(v.lastHired)}</span>;
          case "Last Driver":
            return (
              <span className={cell}>
                {v.lastDriver || "—"}
                {v.lastDriverMobile && <span className="block text-xs text-gray-500">{v.lastDriverMobile}</span>}
              </span>
            );
          case "Owner":
            return <span className={cell}>{v.owner || "—"}</span>;
          case "Suppliers":
            return <span className={cell}>{v.suppliers.join(", ") || "—"}</span>;
          default:
            return null;
        }
      }}
    />
  );
}
