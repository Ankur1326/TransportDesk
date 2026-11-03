import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Package, Truck, UserRound } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { formatInr } from "@/lib/ledger/format";
import { formatIstDate } from "@/lib/dashboard/ui-helpers";
import type { ActiveTrips, LhcStrip, Pipeline, Widget } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const STATS: { label: string; key: keyof Pipeline; href: string; icon: typeof Package }[] = [
  { label: "Booked", key: "booked", href: "/admin/bookings?status=Booked", icon: Package },
  { label: "On Route", key: "onRoute", href: "/admin/bookings?status=On%20Route", icon: Truck },
  { label: "Delivered · 30d", key: "delivered30d", href: "/admin/bookings?status=Delivered", icon: CheckCircle2 },
  { label: "Pending POD", key: "pendingPod", href: "/admin/bookings?status=Pending%20POD", icon: Clock },
  { label: "Ready to bill", key: "readyToBill", href: "/admin/billing/ready-to-bill", icon: Package },
];

export function OperationsSection({
  pipeline,
  activeTrips,
  lhc,
  onRetry,
}: {
  pipeline: Widget<Pipeline>;
  activeTrips: Widget<ActiveTrips>;
  lhc: Widget<LhcStrip>;
  onRetry: () => void;
}) {
  const pipelineData = "error" in pipeline ? null : pipeline;
  const tripsData = "error" in activeTrips ? null : activeTrips;
  const lhcData = "error" in lhc ? null : lhc;

  return (
    <section aria-labelledby="operations-title" className="space-y-4">
      <h2 id="operations-title" className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white">Operations</h2>
      {pipelineData ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map(({ label, key, href, icon: Icon }) => (
            <Link key={key} href={href} className="focus-ring rounded-xl">
              <div className="flex h-full min-h-20 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-brand-800 dark:bg-brand-900">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-200">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">{label}</span>
                  <span className="block text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{pipelineData[key]}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <WidgetUnavailable onRetry={onRetry} />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
        <DashboardPanel title="Active trips" subtitle="On Route consignments · Up to 8 shown">
          {tripsData ? (
            tripsData.items.length ? (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      <tr>
                        <th className="pb-2 pr-3 font-semibold">LR / route</th>
                        <th className="pb-2 pr-3 font-semibold">Vehicle</th>
                        <th className="pb-2 pr-3 font-semibold">Consignor → consignee</th>
                        <th className="pb-2 font-semibold">Expected delivery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-brand-800">
                      {tripsData.items.map((trip) => (
                        <tr key={trip.id} className="text-neutral-700 dark:text-neutral-200">
                          <td className="py-2.5 pr-3">
                            <Link href="/admin/bookings?status=On%20Route" className="focus-ring rounded font-semibold text-brand-700 hover:underline dark:text-accent-300">{trip.lrNo}</Link>
                            <span className="mt-0.5 block max-w-48 truncate text-[10px] text-neutral-500">{trip.from || "—"} → {trip.to || "—"}</span>
                          </td>
                          <td className="py-2.5 pr-3 font-medium">{trip.vehicleNumber || "—"}</td>
                          <td className="max-w-52 truncate py-2.5 pr-3">{trip.consignor || "—"} → {trip.consignee || "—"}</td>
                          <td className="py-2.5">
                            {trip.expectedDeliveryDate ? formatIstDate(trip.expectedDeliveryDate) : "—"}
                            {trip.overdue && <Badge variant="error" className="ml-2">Overdue</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-2 sm:hidden">
                  {tripsData.items.map((trip) => (
                    <li key={trip.id} className="rounded-xl border border-neutral-100 p-3 dark:border-brand-800">
                      <div className="flex items-start justify-between gap-2">
                        <Link href="/admin/bookings?status=On%20Route" className="focus-ring rounded text-sm font-semibold text-brand-700 dark:text-accent-300">{trip.lrNo}</Link>
                        {trip.overdue && <Badge variant="error">Overdue</Badge>}
                      </div>
                      <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-300">{trip.from || "—"} → {trip.to || "—"}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"><Truck className="h-3 w-3" aria-hidden="true" />{trip.vehicleNumber || "Vehicle not set"}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"><UserRound className="h-3 w-3" aria-hidden="true" />{trip.consignor || "—"} → {trip.consignee || "—"}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"><CalendarDays className="h-3 w-3" aria-hidden="true" />{trip.expectedDeliveryDate ? formatIstDate(trip.expectedDeliveryDate) : "No expected date"}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No active trips right now.</p>
          ) : <WidgetUnavailable onRetry={onRetry} />}
          <div className="mt-3 text-right">
            <Link href="/admin/bookings?status=On%20Route" className="focus-ring rounded text-xs font-semibold text-brand-700 hover:underline dark:text-accent-300">View all On Route →</Link>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Lorry hire contracts" subtitle="Contract status · As of now">
          {lhcData ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Hired", lhcData.hired],
                  ["In transit", lhcData.inTransit],
                  ["Delivered", lhcData.delivered],
                  ["Cancelled", lhcData.cancelled],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-brand-950">
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{count}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-3 dark:border-warning-900 dark:bg-warning-950/40">
                <p className="text-xs text-warning-800 dark:text-warning-200">Balance due on delivered trips</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-warning-900 dark:text-warning-100">{formatInr(lhcData.balanceDueOnDelivered)}</p>
              </div>
              <Link href="/admin/lorry-hires" className="focus-ring mt-3 inline-block rounded text-xs font-semibold text-brand-700 hover:underline dark:text-accent-300">View contracts →</Link>
            </>
          ) : <WidgetUnavailable onRetry={onRetry} />}
        </DashboardPanel>
      </div>
    </section>
  );
}
