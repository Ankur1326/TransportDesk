import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatIstDate } from "@/lib/dashboard/ui-helpers";
import { isWidgetError, type ActiveTrips, type Widget } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const BOOKINGS_HREF = "/admin/bookings?status=On%20Route";

export function OperationsSection({
  activeTrips,
  bookings,
  onRetry,
}: {
  activeTrips: Widget<ActiveTrips>;
  bookings: Widget<number>;
  onRetry: () => void;
}) {
  const bookingLabel = isWidgetError(bookings) ? undefined : `${bookings.toLocaleString("en-IN")} bookings this month`;

  return (
    <DashboardPanel title="Active trips" subtitle={bookingLabel}>
      {isWidgetError(bookings) && <WidgetUnavailable onRetry={onRetry} />}
      {isWidgetError(activeTrips) ? (
        <WidgetUnavailable onRetry={onRetry} />
      ) : activeTrips.items.length ? (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-neutral-200 text-[10px] text-neutral-500 dark:border-brand-800 dark:text-neutral-400">
                <tr>
                  <th className="py-2 pr-3 font-medium">LR no.</th>
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium">Vehicle</th>
                  <th className="py-2 pr-3 font-medium">Expected delivery</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-brand-800">
                {activeTrips.items.map((trip) => (
                  <tr key={trip.id} className="text-neutral-700 dark:text-neutral-200">
                    <td className="py-2.5 pr-3">
                      <Link href={BOOKINGS_HREF} className="focus-ring rounded font-medium text-brand-700 hover:underline dark:text-accent-300">{trip.lrNo || "—"}</Link>
                    </td>
                    <td className="max-w-52 truncate py-2.5 pr-3">{trip.from || "—"} → {trip.to || "—"}</td>
                    <td className="py-2.5 pr-3">{trip.vehicleNumber || "—"}</td>
                    <td className="py-2.5 pr-3">{trip.expectedDeliveryDate ? formatIstDate(trip.expectedDeliveryDate) : "—"}</td>
                    <td className="py-2.5 text-right">{trip.overdue ? <Badge variant="error">Overdue</Badge> : "On Route"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-neutral-200 sm:hidden dark:divide-brand-800">
            {activeTrips.items.map((trip) => (
              <li key={trip.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={BOOKINGS_HREF} className="focus-ring rounded text-sm font-medium text-brand-700 hover:underline dark:text-accent-300">{trip.lrNo || "—"}</Link>
                  {trip.overdue ? <Badge variant="error">Overdue</Badge> : <span className="text-xs text-neutral-500 dark:text-neutral-400">On Route</span>}
                </div>
                <p className="mt-1 truncate text-xs text-neutral-700 dark:text-neutral-300">{trip.from || "—"} → {trip.to || "—"}</p>
                <p className="mt-1 flex justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="truncate">{trip.vehicleNumber || "Vehicle not set"}</span>
                  <span className="shrink-0">{trip.expectedDeliveryDate ? formatIstDate(trip.expectedDeliveryDate) : "No expected date"}</span>
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-4 text-sm text-neutral-500 dark:text-neutral-400">No active trips.</p>
      )}
      <div className="mt-2 border-t border-neutral-200 pt-2 text-right dark:border-brand-800">
        <Link href={BOOKINGS_HREF} className="focus-ring rounded text-xs text-brand-700 hover:underline dark:text-accent-300">View all On Route</Link>
      </div>
    </DashboardPanel>
  );
}
