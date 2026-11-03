/**
 * Typed payload of GET /api/admin/dashboard, shared by the API and the UI.
 * Browser-safe: types only, no server imports.
 *
 * MONEY: every amount in this payload is in RUPEES as a plain number with at
 * most 2 decimals (the unit the Payment, Bill and LorryHire models store).
 * Sums are accumulated in integer paise on the server (see lib/ledger/build-ledger
 * `paise` / `fromPaise`) and converted back at the boundary, so floating point
 * never leaks into a total. The UI formats with lib/ledger/format `formatInr`.
 */
import type { AgeingBucket } from "@/lib/ledger/ageing";
import type { PeriodKey } from "@/lib/dashboard/periods";

/** A widget whose query failed. The rest of the payload is still returned. */
export interface WidgetError {
  error: true;
}
export type Widget<T> = T | WidgetError;

export const isWidgetError = (w: unknown): w is WidgetError =>
  typeof w === "object" && w !== null && (w as { error?: unknown }).error === true;

/* ---------------------------------- meta ---------------------------------- */

export interface PeriodInfo {
  key: PeriodKey;
  label: string;
  /** ISO instants; the window is [from, to). */
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  compareLabel: string;
  /** Inclusive IST calendar days, `YYYY-MM-DD`. */
  fromYmd: string;
  toYmd: string;
}

export interface DashboardMeta {
  generatedAt: string;
  timezone: "Asia/Kolkata";
  currency: "INR";
  moneyUnit: "rupees";
  period: PeriodInfo;
}

/** What the company has set up so far; drives the onboarding card. */
export interface SetupState {
  hasCustomers: boolean;
  hasConsignments: boolean;
  hasBills: boolean;
  hasCompanyName: boolean;
  /** Nothing created yet: show onboarding instead of an empty dashboard. */
  isNewCompany: boolean;
}

/* ---------------------------------- KPIs ---------------------------------- */

export interface KpiValue {
  value: number;
  /** Same metric over the previous equivalent window; null when it does not apply (snapshots). */
  previous: number | null;
  /** Percentage change, null when previous is absent or zero. */
  deltaPct: number | null;
}

export interface Financials {
  revenue: KpiValue;
  expenses: {
    total: KpiValue;
  };
  netProfit: KpiValue;
  marginPct: number | null;
  trend: FinancialTrendPoint[];
  trendUnit: "day" | "month";
}

/* ------------------------- receivables / payables ------------------------- */

export interface PartyRow {
  id: string;
  name: string;
  /** What the party owes us (customers) / what we owe them (suppliers). Always > 0. */
  amount: number;
  /** Age in whole IST calendar days of the oldest open dated document, if any. */
  oldestDays: number | null;
}

export interface AgeingSummary {
  buckets: AgeingBucket[];
  /** Sum of open-invoice outstanding across the buckets. */
  total: number;
}

export interface PartySnapshot {
  /** Sum of the positive balances only: what is actually owed. Advances never offset other parties' dues. */
  total: number;
  /** Sum of balances running the other way (customer advances / supplier prepayments), shown as a note. */
  advances: number;
  partyCount: number;
  /** Parties whose balance is > 0. */
  owingCount: number;
  ageing: AgeingSummary;
  /** total - ageing.total: opening balances, unbilled LRs and unapplied credits have no invoice date. Can be negative. */
  unaged: number;
  /** Amount in invoices older than 30 days (the 31-60, 61-90 and 90+ buckets). */
  overdue: number;
  top: PartyRow[];
  /** Open invoices / contracts older than `creditDays` (customers only; used by the action centre). */
  overdueDocs: { count: number; amount: number } | null;
  /** True when the company has more parties than the dashboard reads; totals then cover the first N. */
  partial: boolean;
}

/* -------------------------------- operations ------------------------------ */

export interface ActiveTrip {
  id: string;
  lrNo: string;
  from: string;
  to: string;
  vehicleNumber: string;
  /** ISO or null when no expected date was entered. */
  expectedDeliveryDate: string | null;
  overdue: boolean;
}

export interface ActiveTrips {
  items: ActiveTrip[];
}

export interface PodPending {
  count: number;
  /** Whole days the longest-waiting POD has been pending; null when no delivery date is known. */
  oldestDays: number | null;
}

export interface ReadyToBillSummary {
  count: number;
  /** Sum of LR charges.freight. */
  estimatedFreight: number;
}

export interface ExpiringDocuments {
  expired: number;
  expiringSoon: number;
}

/**
 * Raw facts the action centre is built from. Each field is null when its
 * source is unavailable (missing feature) or failed, and the matching card is skipped.
 */
export interface OperationsFacts {
  podPending: PodPending | null;
  readyToBill: ReadyToBillSummary | null;
  onRouteOverdue: number;
  documents: ExpiringDocuments | null;
}

/* ------------------------------ action centre ----------------------------- */

export type ActionUrgency = "critical" | "high" | "medium";
export type ActionId =
  | "pod-pending"
  | "ready-to-bill"
  | "overdue-bills"
  | "documents"
  | "late-trips";

export interface ActionItem {
  id: ActionId;
  count: number;
  title: string;
  description: string;
  urgency: ActionUrgency;
  /** Rupees, when the card is about money. */
  amount?: number;
  href: string;
}

export interface ActionCentre {
  /** Cards with a non-zero count, most urgent first. */
  items: ActionItem[];
  /** Checks that could not run (missing feature or failed source). "All caught up" is only claimed when this is empty. */
  unavailable: ActionId[];
}

export interface FinancialTrendPoint {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

/* --------------------------------- payload -------------------------------- */

export interface DashboardPayload {
  meta: DashboardMeta;
  setup: Widget<SetupState>;
  bookings: Widget<number>;
  financials: Widget<Financials>;
  receivables: Widget<PartySnapshot>;
  payables: Widget<PartySnapshot>;
  activeTrips: Widget<ActiveTrips>;
  actions: Widget<ActionCentre>;
}
