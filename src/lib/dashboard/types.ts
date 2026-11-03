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

/**
 * Which optional features this deployment has. A metric that needs a missing
 * feature is `null` in the payload (or uses the documented fallback), never a crash.
 */
export interface DashboardCapabilities {
  /** Consignment.podStatus exists. Otherwise "Delivered with no podUrl" means POD pending. */
  podStatus: boolean;
  /** Consignment.billing.billed exists (informational: billed state is always read from Bill documents). */
  billingMarker: boolean;
  /** Vehicle / Driver master collections exist. */
  vehicleMaster: boolean;
  driverMaster: boolean;
}

export interface DashboardMeta {
  generatedAt: string;
  timezone: "Asia/Kolkata";
  currency: "INR";
  moneyUnit: "rupees";
  period: PeriodInfo;
  capabilities: DashboardCapabilities;
  /** Overdue-bill threshold used by the action centre, in days. */
  creditDays: number;
}

export interface CompanyInfo {
  name: string | null;
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
}

export interface Kpis {
  bookings: KpiValue;
  freightBilled: KpiValue;
  collected: KpiValue;
  paidToSuppliers: KpiValue;
  /** LR freight earned minus LHC hire cost for LHCs dated in the window. */
  grossMargin: KpiValue & {
    revenue: number;
    cost: number;
    /** null when there is no revenue to measure against. */
    marginPct: number | null;
    trips: number;
    lossTrips: number;
  };
}

/* ------------------------- receivables / payables ------------------------- */

export interface PartyRow {
  id: string;
  name: string;
  /** What the party owes us (customers) / what we owe them (suppliers). Always > 0. */
  amount: number;
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

export interface Pipeline {
  booked: number;
  onRoute: number;
  /** Delivered in the last 30 days (IST days, today included). */
  delivered30d: number;
  /** Delivered, POD still Pending. */
  pendingPod: number;
  /** Delivered, POD Received/Submitted, not on a bill. */
  readyToBill: number;
}

export interface ActiveTrip {
  id: string;
  lrNo: string;
  from: string;
  to: string;
  vehicleNumber: string;
  consignor: string;
  consignee: string;
  /** ISO or null when no expected date was entered. */
  expectedDeliveryDate: string | null;
  overdue: boolean;
}

export interface ActiveTrips {
  /** All LRs On Route (the list below is capped at 8). */
  total: number;
  items: ActiveTrip[];
}

export interface LhcStrip {
  hired: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  /** Sum of settlement.balance on non-cancelled, Delivered LHCs. */
  balanceDueOnDelivered: number;
  /** Delivered, non-cancelled LHCs with a balance above zero. */
  deliveredWithBalance: number;
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
  /** Where the dates came from. */
  source: "lorry-hire-contracts";
  expired: number;
  expiringSoon: number;
  /** The soonest ones, expired first. */
  items: { kind: "Vehicle insurance" | "Driver licence"; subject: string; date: string; expired: boolean }[];
  /** Document kinds nothing records yet. */
  unavailable: string[];
}

export interface EwayExpiring {
  /** Not Delivered or Cancelled, e-way bill expired in the last 7 days or expiring within 24 hours. */
  count: number;
  expired: number;
}

/**
 * Raw facts the action centre is built from. Each field is null when its
 * source is unavailable (missing feature) or failed, and the matching card is skipped.
 */
export interface OperationsFacts {
  pipeline: Pipeline;
  podPending: PodPending | null;
  readyToBill: ReadyToBillSummary | null;
  onRouteOverdue: number;
  eway: EwayExpiring;
  documents: ExpiringDocuments | null;
}

/* ------------------------------ action centre ----------------------------- */

export type ActionUrgency = "critical" | "high" | "medium";
export type ActionId =
  | "pod-pending"
  | "ready-to-bill"
  | "overdue-bills"
  | "supplier-dues"
  | "documents"
  | "late-trips"
  | "eway";

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

/* --------------------------------- trends --------------------------------- */

export interface RevenueCostPoint {
  key: string;
  label: string;
  revenue: number;
  cost: number;
}

export interface TopCustomer {
  id: string | null;
  name: string;
  amount: number;
}

export interface TopRoute {
  from: string;
  to: string;
  count: number;
}

export interface CollectionPoint {
  key: string;
  label: string;
  amount: number;
}

export interface Trends {
  revenueVsCost: RevenueCostPoint[];
  topCustomers: TopCustomer[];
  /** null: the LRs in the window carry no from / to data. */
  topRoutes: TopRoute[] | null;
  collections: { unit: "day" | "week"; points: CollectionPoint[] };
}

/* --------------------------------- activity -------------------------------- */

export type ActivityKind = "lr" | "bill" | "payment" | "lhc";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** ISO instant. */
  at: string;
  text: string;
  href: string;
}

/* --------------------------------- payload -------------------------------- */

export interface DashboardPayload {
  meta: DashboardMeta;
  company: CompanyInfo;
  setup: Widget<SetupState>;
  kpis: Widget<Kpis>;
  receivables: Widget<PartySnapshot>;
  payables: Widget<PartySnapshot>;
  pipeline: Widget<Pipeline>;
  activeTrips: Widget<ActiveTrips>;
  lhc: Widget<LhcStrip>;
  actions: Widget<ActionCentre>;
  trends: Widget<Trends>;
  recent: Widget<ActivityItem[]>;
}
