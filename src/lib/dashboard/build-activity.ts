/**
 * Recent activity feed: merges events from several collections into one
 * newest-first list. Pure; the loader supplies already-fetched raw events.
 */
import { formatInr } from "@/lib/ledger/format";
import type { ActivityItem } from "@/lib/dashboard/types";

export const ACTIVITY_LIMIT = 10;

export type RawActivity =
  | { type: "lr_created"; id: string; at: Date | string; lrNo: string; consignor?: string; to?: string }
  | { type: "lr_status"; id: string; at: Date | string; lrNo: string; status: string; note?: string }
  | { type: "bill_created"; id: string; at: Date | string; billNo: string; party?: string; amount: number }
  | {
      type: "payment";
      id: string;
      at: Date | string;
      direction: "received" | "paid";
      amount: number;
      party?: string;
      partyType: "customer" | "supplier";
      partyId?: string;
    }
  | { type: "lhc_created"; id: string; at: Date | string; lhcNo: string; supplier?: string; vehicle?: string };

const clean = (s?: string) => (s ?? "").trim();
const toTime = (v: Date | string) => new Date(v).getTime();

/** "₹45,000 received from ABC Traders" style text for one raw event. */
export function describeActivity(e: RawActivity): ActivityItem {
  const at = new Date(e.at).toISOString();
  switch (e.type) {
    case "lr_created": {
      const to = clean(e.to);
      const who = clean(e.consignor);
      return {
        id: `lr:${e.id}`,
        type: "lr",
        at,
        text: `LR ${e.lrNo} booked${who ? ` for ${who}` : ""}${to ? ` · to ${to}` : ""}`,
        href: `/admin/bookings`,
      };
    }
    case "lr_status": {
      // POD entries already read "POD Pending → Received: ..." and say more than the bare status.
      const note = clean(e.note);
      const text = note.startsWith("POD") ? `LR ${e.lrNo} · ${note}` : `LR ${e.lrNo} marked ${e.status}`;
      return { id: `lrs:${e.id}:${at}`,       type: "lr", at, text, href: `/admin/bookings` };
    }
    case "bill_created": {
      const party = clean(e.party);
      return {
        id: `bill:${e.id}`,
        type: "bill",
        amount: e.amount,
        at,
        text: `Bill ${e.billNo} created${party ? ` for ${party}` : ""} · ${formatInr(e.amount)}`,
        href: `/admin/billings`,
      };
    }
    case "payment": {
      const party = clean(e.party);
      const verb = e.direction === "received" ? "received from" : "paid to";
      return {
        id: `pay:${e.id}`,
        type: "payment",
        amount: e.amount,
        at,
        text: `${formatInr(e.amount)} ${party ? `${verb} ${party}` : e.direction}`,
        href: e.partyType === "supplier" ? "/admin/suppliers" : "/admin/customers",
      };
    }
    case "lhc_created": {
      const supplier = clean(e.supplier);
      const vehicle = clean(e.vehicle);
      return {
        id: `lhc:${e.id}`,
        type: "lhc",
        at,
        text: `Contract ${e.lhcNo} created${supplier ? ` with ${supplier}` : ""}${vehicle ? ` · ${vehicle}` : ""}`,
        href: `/admin/lorry-hires`,
      };
    }
  }
}

/**
 * Newest first, de-duplicated by id, capped at `limit`. Events with an
 * unreadable timestamp are dropped rather than sorted to a random place.
 */
export function buildActivity(events: readonly RawActivity[], limit: number = ACTIVITY_LIMIT): ActivityItem[] {
  const seen = new Set<string>();
  return events
    .filter((e) => !Number.isNaN(toTime(e.at)))
    .map(describeActivity)
    .sort((a, b) => toTime(b.at) - toTime(a.at) || a.id.localeCompare(b.id))
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .slice(0, limit);
}
