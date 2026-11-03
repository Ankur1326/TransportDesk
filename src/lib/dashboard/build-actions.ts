/**
 * The "Needs attention" list. Pure: takes already-loaded facts, returns cards.
 * A card whose count is zero is dropped; a fact that is null (missing feature
 * or failed source) is reported in `unavailable` so the UI never claims
 * "all caught up" about a check that did not run.
 */
import { formatInr } from "@/lib/ledger/format";
import type {
  ActionCentre,
  ActionId,
  ActionItem,
  ActionUrgency,
  LhcStrip,
  OperationsFacts,
  PartySnapshot,
} from "@/lib/dashboard/types";

const URGENCY_RANK: Record<ActionUrgency, number> = { critical: 0, high: 1, medium: 2 };

/** Stable tie-break so the order never flickers between refreshes. */
const ID_ORDER: ActionId[] = ["eway", "overdue-bills", "documents", "late-trips", "supplier-dues", "pod-pending", "ready-to-bill"];

/** POD waiting longer than this many days is escalated to "high". Mirrors podAgeLevel's "overdue" (more than 7). */
export const POD_ESCALATE_AFTER_DAYS = 7;

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

export interface ActionInputs {
  ops: OperationsFacts | null;
  lhc: LhcStrip | null;
  /** Customer snapshot; only its overdueDocs is used. */
  receivables: Pick<PartySnapshot, "overdueDocs"> | null;
  creditDays: number;
}

export function buildActions(input: ActionInputs): ActionCentre {
  const items: ActionItem[] = [];
  const unavailable: ActionId[] = [];
  const { ops, lhc, receivables, creditDays } = input;

  // 1. POD pending
  if (ops?.podPending) {
    const { count, oldestDays } = ops.podPending;
    if (count > 0) {
      items.push({
        id: "pod-pending",
        count,
        title: "Delivered, POD pending",
        description:
          `${plural(count, "delivered LR is", "delivered LRs are")} still waiting for the proof of delivery` +
          (oldestDays !== null ? ` (oldest ${oldestDays === 0 ? "today" : plural(oldestDays, "day", "days")}).` : "."),
        urgency: oldestDays !== null && oldestDays > POD_ESCALATE_AFTER_DAYS ? "high" : "medium",
        href: "/admin/bookings?status=Pending%20POD",
      });
    }
  } else unavailable.push("pod-pending");

  // 2. Ready to bill
  if (ops?.readyToBill) {
    const { count, estimatedFreight } = ops.readyToBill;
    if (count > 0) {
      items.push({
        id: "ready-to-bill",
        count,
        title: "Ready to bill",
        description: `${plural(count, "LR is", "LRs are")} delivered with POD in hand and not billed yet: about ${formatInr(estimatedFreight)} of freight.`,
        urgency: "medium",
        amount: estimatedFreight,
        href: "/admin/billing/ready-to-bill",
      });
    }
  } else unavailable.push("ready-to-bill");

  // 3. Overdue customer bills
  if (receivables?.overdueDocs) {
    const { count, amount } = receivables.overdueDocs;
    if (count > 0) {
      items.push({
        id: "overdue-bills",
        count,
        title: "Overdue customer bills",
        description: `${plural(count, "bill is", "bills are")} unpaid more than ${creditDays} days after the bill date: ${formatInr(amount)}.`,
        urgency: "critical",
        amount,
        href: "/admin/customers",
      });
    }
  } else unavailable.push("overdue-bills");

  // 4. Supplier balances on delivered trips
  if (lhc) {
    if (lhc.deliveredWithBalance > 0 && lhc.balanceDueOnDelivered > 0) {
      items.push({
        id: "supplier-dues",
        count: lhc.deliveredWithBalance,
        title: "Supplier balance on delivered trips",
        description: `${formatInr(lhc.balanceDueOnDelivered)} is still unpaid on ${plural(lhc.deliveredWithBalance, "delivered trip", "delivered trips")}.`,
        urgency: "high",
        amount: lhc.balanceDueOnDelivered,
        href: "/admin/lorry-hires?status=Delivered",
      });
    }
  } else unavailable.push("supplier-dues");

  // 5. Documents
  if (ops?.documents) {
    const { expired, expiringSoon } = ops.documents;
    const count = expired + expiringSoon;
    if (count > 0) {
      items.push({
        id: "documents",
        count,
        title: expired > 0 ? "Documents expired or expiring" : "Documents expiring soon",
        description:
          `${expired > 0 ? `${plural(expired, "document has", "documents have")} expired` : ""}` +
          `${expired > 0 && expiringSoon > 0 ? " and " : ""}` +
          `${expiringSoon > 0 ? `${plural(expiringSoon, "expires", "expire")} within 30 days` : ""}` +
          " (vehicle insurance, driver licence).",
        urgency: expired > 0 ? "critical" : "medium",
        href: "/admin/lorry-hires",
      });
    }
  } else unavailable.push("documents");

  // 6. On-route LRs past their expected delivery date
  if (ops) {
    if (ops.onRouteOverdue > 0) {
      items.push({
        id: "late-trips",
        count: ops.onRouteOverdue,
        title: "Trips running late",
        description: `${plural(ops.onRouteOverdue, "LR is", "LRs are")} On Route past the expected delivery date.`,
        urgency: "high",
        href: "/admin/bookings?status=On%20Route",
      });
    }
    // 7. E-way bills
    if (ops.eway.count > 0) {
      items.push({
        id: "eway",
        count: ops.eway.count,
        title: "E-way bills expiring",
        description:
          `${plural(ops.eway.count, "e-way bill", "e-way bills")} on undelivered LRs ` +
          (ops.eway.expired > 0 ? `${ops.eway.expired === ops.eway.count ? "have expired" : `(${ops.eway.expired} already expired)`} or expire within 24 hours.` : "expire within 24 hours."),
        urgency: "critical",
        href: "/admin/bookings",
      });
    }
  } else {
    unavailable.push("late-trips", "eway");
  }

  items.sort(
    (a, b) =>
      URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
      ID_ORDER.indexOf(a.id) - ID_ORDER.indexOf(b.id)
  );
  return { items, unavailable };
}
