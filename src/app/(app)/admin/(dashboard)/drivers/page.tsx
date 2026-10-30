"use client";
import ReportTable from "@/components/lorry-hire/ReportTable";
import { formatLedgerDate } from "@/lib/ledger/format";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import type { DriverSummary } from "@/lib/lorry-hire/fleet-reports";

const HEADINGS = ["Driver", "Mobile", "Licence No.", "Trips", "Vehicles", "Last Trip"];

const cell = "whitespace-normal break-words text-sm text-gray-900 dark:text-gray-200";

export default function DriversPage() {
  return (
    <ReportTable<DriverSummary>
      endpoint="/api/admin/lorry-hires/drivers"
      headings={HEADINGS}
      renderCell={(d, key) => {
        switch (key) {
          case "Driver":
            return <span className="font-medium">{d.name}</span>;
          case "Mobile":
            return <span className={cell}>{d.mobile || "—"}</span>;
          case "Licence No.":
            return <span className={cell}>{d.licenseNumber || "—"}</span>;
          case "Trips":
            return <span className={cell}>{d.trips}</span>;
          case "Vehicles":
            return <span className={cell}>{d.vehicles.map(formatVehicleNumber).join(", ") || "—"}</span>;
          case "Last Trip":
            return <span className={cell}>{formatLedgerDate(d.lastTrip)}</span>;
          default:
            return null;
        }
      }}
    />
  );
}
