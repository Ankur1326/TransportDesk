import Link from "next/link";
import type { AgeingBucket } from "@/lib/ledger/ageing";
import { formatInr } from "@/lib/ledger/format";
import type { PartySnapshot } from "@/lib/dashboard/types";
import { DashboardPanel, WidgetUnavailable } from "./DashboardPrimitives";

const BUCKET_COLORS: Record<AgeingBucket["key"], string> = {
  "0-30": "bg-success-500",
  "31-60": "bg-warning-400",
  "61-90": "bg-orange-500",
  "90+": "bg-error-600",
};

function PartySnapshotContent({
  snapshot,
  kind,
}: {
  snapshot: PartySnapshot;
  kind: "customer" | "supplier";
}) {
  const href = kind === "customer" ? "/admin/customers" : "/admin/suppliers";
  const ageingTotal = snapshot.ageing.total;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tabular-nums text-neutral-950 dark:text-white">{formatInr(snapshot.total)}</p>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">As of now · {snapshot.owingCount} owing</p>
        </div>
        <Link href={href} className="focus-ring rounded px-1 py-1 text-xs font-semibold text-brand-700 hover:underline dark:text-accent-300">View all</Link>
      </div>

      <div className="mt-4">
        {ageingTotal > 0 ? (
          <>
            <div
              role="img"
              aria-label={`Ageing distribution: ${snapshot.ageing.buckets.map((bucket) => `${bucket.label} ${formatInr(bucket.amount)}`).join(", ")}`}
              className="flex h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-brand-800"
            >
              {snapshot.ageing.buckets.map((bucket) => bucket.amount > 0 && (
                <span key={bucket.key} className={BUCKET_COLORS[bucket.key]} style={{ width: `${(bucket.amount / ageingTotal) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
              {snapshot.ageing.buckets.map((bucket) => (
                <li key={bucket.key} className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${BUCKET_COLORS[bucket.key]}`} aria-hidden="true" />
                    {bucket.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">{formatInr(bucket.amount)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-brand-950 dark:text-neutral-400">No open invoices with ageing data yet.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 dark:border-warning-900 dark:bg-warning-950/40">
        <span className="text-xs font-medium text-warning-800 dark:text-warning-200">Over 30 days</span>
        <span className="text-sm font-bold tabular-nums text-warning-900 dark:text-warning-100">{formatInr(snapshot.overdue)}</span>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Top {kind === "customer" ? "customers" : "suppliers"}</h3>
        {snapshot.top.length ? (
          <ul className="mt-2 divide-y divide-neutral-100 dark:divide-brand-800">
            {snapshot.top.map((party) => (
              <li key={party.id}>
                <Link
                  href={`${href}?partyId=${encodeURIComponent(party.id)}`}
                  className="focus-ring flex min-h-11 items-center justify-between gap-3 rounded px-1 text-sm hover:bg-neutral-50 dark:hover:bg-brand-800/60"
                >
                  <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-200">{party.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">{formatInr(party.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">No outstanding parties.</p>
        )}
      </div>
      <p className="mt-3 text-right text-[10px] text-neutral-400">Ageing covers open dated invoices only.</p>
    </>
  );
}

export function PartySnapshotCard({
  snapshot,
  kind,
  onRetry,
}: {
  snapshot: PartySnapshot | { error: true };
  kind: "customer" | "supplier";
  onRetry: () => void;
}) {
  const title = kind === "customer" ? "Customers owe you" : "You owe suppliers";
  return (
    <DashboardPanel title={title} subtitle="Outstanding balance · As of now">
      {"error" in snapshot ? <WidgetUnavailable onRetry={onRetry} /> : <PartySnapshotContent snapshot={snapshot} kind={kind} />}
    </DashboardPanel>
  );
}
