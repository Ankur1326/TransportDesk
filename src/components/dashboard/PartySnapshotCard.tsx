import Link from "next/link";
import type { AgeingBucket } from "@/lib/ledger/ageing";
import { formatInr } from "@/lib/ledger/format";
import { isWidgetError, type PartySnapshot, type Widget } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const BUCKET_COLORS: Record<AgeingBucket["key"], string> = {
  "0-30": "bg-neutral-300 dark:bg-neutral-600",
  "31-60": "bg-neutral-400 dark:bg-neutral-500",
  "61-90": "bg-neutral-500 dark:bg-neutral-400",
  "90+": "bg-neutral-700 dark:bg-neutral-300",
};

export function PartySnapshotCard({
  snapshot,
  kind,
  onRetry,
}: {
  snapshot: Widget<PartySnapshot>;
  kind: "customer" | "supplier";
  onRetry: () => void;
}) {
  const title = kind === "customer" ? "Receivables" : "Payables";
  const href = kind === "customer" ? "/admin/customers" : "/admin/suppliers";
  return (
    <DashboardPanel title={title}>
      {isWidgetError(snapshot) ? (
        <WidgetUnavailable onRetry={onRetry} />
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xl font-semibold tabular-nums text-neutral-950 dark:text-white" title={formatInr(snapshot.total)}>{formatInr(snapshot.total)}</p>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">As of now</span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden bg-neutral-100 dark:bg-brand-800" role="img" aria-label={`Ageing: ${snapshot.ageing.buckets.map((bucket) => `${bucket.label} ${formatInr(bucket.amount)}`).join(", ")}`}>
            {snapshot.ageing.buckets.map((bucket) => (
              <span
                key={bucket.key}
                className={BUCKET_COLORS[bucket.key]}
                style={{ width: `${snapshot.ageing.total > 0 ? (bucket.amount / snapshot.ageing.total) * 100 : 0}%` }}
              />
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-4 gap-1">
            {snapshot.ageing.buckets.map((bucket) => (
              <li key={bucket.key} className="min-w-0">
                <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">{bucket.label}</span>
                <span className="block truncate text-xs tabular-nums text-neutral-800 dark:text-neutral-200" title={formatInr(bucket.amount)}>{formatInr(bucket.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 overflow-x-auto">
            {snapshot.top.length ? (
              <table className="w-full min-w-[300px] text-left text-xs">
                <thead className="border-b border-neutral-200 text-[10px] text-neutral-500 dark:border-brand-800 dark:text-neutral-400">
                  <tr><th className="py-1.5 font-medium">Party</th><th className="py-1.5 text-right font-medium">Outstanding</th><th className="py-1.5 text-right font-medium">Oldest</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-brand-800">
                  {snapshot.top.map((party) => (
                    <tr key={party.id}>
                      <td className="max-w-40 py-2 pr-2">
                        <Link href={`${href}?partyId=${encodeURIComponent(party.id)}`} className="focus-ring block truncate rounded text-neutral-800 hover:underline dark:text-neutral-200">{party.name}</Link>
                      </td>
                      <td className="py-2 text-right tabular-nums text-neutral-800 dark:text-neutral-200">{formatInr(party.amount)}</td>
                      <td className="py-2 pl-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">{party.oldestDays === null ? "—" : `${party.oldestDays}d`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="py-3 text-xs text-neutral-500 dark:text-neutral-400">No outstanding parties.</p>}
          </div>
          <Link href={href} className="focus-ring mt-2 inline-block rounded text-xs text-brand-700 hover:underline dark:text-accent-300">View all</Link>
        </>
      )}
    </DashboardPanel>
  );
}
