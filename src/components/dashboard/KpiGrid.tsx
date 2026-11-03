import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { formatInr } from "@/lib/ledger/format";
import { compactInr } from "@/lib/dashboard/ui-helpers";
import { isWidgetError, type KpiValue, type Kpis, type PartySnapshot, type Widget } from "@/lib/dashboard/types";
import { WidgetUnavailable } from "./DashboardPrimitives";

interface KpiCardProps {
  label: string;
  value: number;
  href: string;
  metric?: KpiValue;
  inverse?: boolean;
  icon: string;
  detail?: string;
  description?: string;
}

function KpiCard({ label, value, href, metric, inverse = false, icon, detail, description }: KpiCardProps) {
  const delta = metric?.deltaPct;
  const positive = delta != null && (inverse ? delta < 0 : delta > 0);
  const negative = delta != null && (inverse ? delta > 0 : delta < 0);
  return (
    <Link
      href={href}
      title={`${label}: ${value < 0 ? "−" : ""}${formatInr(value)}${description ? `. ${description}` : ""}`}
      className="focus-ring block min-w-0 rounded-2xl"
    >
      <Card interactive className="h-full rounded-2xl border-neutral-200 bg-white p-3 shadow-sm dark:border-brand-800 dark:bg-brand-900 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-xs font-medium leading-5 text-neutral-600 dark:text-neutral-400">{label}</p>
          <span
            aria-hidden={!description}
            aria-label={description ? `${label} details: ${description}` : undefined}
            title={description}
            tabIndex={description ? 0 : undefined}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-sm font-bold text-accent-700 dark:bg-accent-950 dark:text-accent-300"
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 truncate text-xl font-bold tabular-nums tracking-tight text-neutral-950 dark:text-white sm:text-2xl">
          {compactInr(value)}
        </p>
        {detail && <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{detail}</p>}
        {metric && delta != null ? (
          <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${positive ? "text-success-700 dark:text-success-300" : negative ? "text-error-700 dark:text-error-300" : "text-neutral-500 dark:text-neutral-400"}`}>
            {positive ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : negative ? <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{Math.abs(delta).toFixed(1)}% vs previous period</span>
            <span className="sr-only">{positive ? "Improved" : negative ? "Declined" : "Unchanged"}</span>
          </p>
        ) : metric ? (
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">No previous period comparison</p>
        ) : (
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">As of now</p>
        )}
      </Card>
    </Link>
  );
}

function isValue<T>(value: Widget<T>): value is T {
  return !isWidgetError(value);
}

export function KpiGrid({
  kpis,
  receivables,
  payables,
  onRetry,
}: {
  kpis: Widget<Kpis>;
  receivables: Widget<PartySnapshot>;
  payables: Widget<PartySnapshot>;
  onRetry: () => void;
}) {
  const hasKpis = isValue(kpis);
  const cards: KpiCardProps[] = [];
  if (hasKpis) {
    cards.push(
      { label: "Bookings", value: kpis.bookings.value, metric: kpis.bookings, href: "/admin/bookings", icon: "LR" },
      { label: "Billed (incl. GST)", value: kpis.freightBilled.value, metric: kpis.freightBilled, href: "/admin/billings", icon: "₹" },
      { label: "Collected", value: kpis.collected.value, metric: kpis.collected, href: "/admin/customers", icon: "↓" },
      { label: "Paid to suppliers", value: kpis.paidToSuppliers.value, metric: kpis.paidToSuppliers, inverse: true, href: "/admin/suppliers", icon: "↑" },
      {
        label: "Gross margin (per trip)",
        value: kpis.grossMargin.value,
        metric: kpis.grossMargin,
        href: "/admin/reports/trip-profit",
        icon: "↗",
        description: "LR freight earned minus linked LHC hire cost, allocated per trip.",
        detail: `${kpis.grossMargin.trips} trips · ${kpis.grossMargin.marginPct == null ? "—" : `${kpis.grossMargin.marginPct}% margin`}`,
      }
    );
  }
  if (isValue(receivables)) cards.splice(4, 0, {
    label: "Receivable",
    value: receivables.total,
    href: "/admin/customers",
    icon: "↙",
  });
  if (isValue(payables)) cards.splice(5, 0, {
    label: "Payable",
    value: payables.total,
    inverse: true,
    href: "/admin/suppliers",
    icon: "↗",
  });

  if (!cards.length) {
    return <WidgetUnavailable onRetry={onRetry} />;
  }

  return (
    <section aria-label="Key performance indicators" className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => <KpiCard key={card.label} {...card} />)}
      </div>
      {!hasKpis && <p className="text-xs text-neutral-500 dark:text-neutral-400">Flow metrics are not available yet.</p>}
    </section>
  );
}
