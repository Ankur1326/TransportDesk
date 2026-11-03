/**
 * "Ready to bill" rules: Delivered, POD Received/Submitted, not cancelled and
 * not already on a bill. Pure — shared by the API route and the UI.
 */
import { isPodCleared } from "@/lib/pod-status";

export interface BillingPartyFields {
  consignor?: { name?: string } | null;
  consignee?: { name?: string } | null;
  payment?: { billingParty?: string; billingAccount?: string } | null;
}

export type BillingPartyKind = "Consignor" | "Consignee" | "Third Party";

export interface BillingParty {
  /** Lower-cased trimmed name; "" when the LR has no usable billing party. */
  key: string;
  name: string;
  kind: BillingPartyKind;
}

/** A bill can't carry more LRs than this when opened from the list (the LR ids travel in the URL). */
export const MAX_LRS_PER_BILL = 50;

export const NO_BILLING_PARTY_LABEL = "No billing party set";

const clean = (v?: string | null) => (v ?? "").trim();

/**
 * Who pays: the consignor or consignee named by `payment.billingParty`, or the
 * `payment.billingAccount` for a third party. Legacy LRs with no billingParty
 * are billed to the consignor (the form's own default).
 */
export function billingPartyOf(lr: BillingPartyFields): BillingParty {
  const which = lr.payment?.billingParty;
  const kind: BillingPartyKind = which === "Consignee" ? "Consignee" : which === "Third Party" ? "Third Party" : "Consignor";
  const name = clean(
    kind === "Consignee" ? lr.consignee?.name : kind === "Third Party" ? lr.payment?.billingAccount : lr.consignor?.name
  );
  return { key: name.toLowerCase(), name, kind };
}

/** Delivered, POD in hand, not cancelled (Delivered can't be cancelled, but guard anyway) and not billed. */
export function isReadyToBill(
  lr: { _id?: unknown; status?: unknown; podStatus?: unknown },
  billedIds: ReadonlySet<string>
): boolean {
  return lr.status === "Delivered" && isPodCleared(lr) && !billedIds.has(String(lr._id));
}

export interface PartyGroup<T> {
  key: string;
  /** Display name; NO_BILLING_PARTY_LABEL when `unassigned`. */
  partyName: string;
  /** Billing-party kind of the group's first LR (groups can mix Consignor/Consignee roles of the same party). */
  kind: BillingPartyKind;
  /** No usable party name, so a bill can't be started for it. */
  unassigned: boolean;
  items: T[];
}

/**
 * Group LRs by billing party (case-insensitive). Group order follows the first
 * LR of each group, so a list sorted oldest-first keeps the longest-waiting
 * parties on top; the unassigned group always goes last.
 */
export function groupByBillingParty<T extends BillingPartyFields>(lrs: readonly T[]): PartyGroup<T>[] {
  const groups = new Map<string, PartyGroup<T>>();
  for (const lr of lrs) {
    const party = billingPartyOf(lr);
    let group = groups.get(party.key);
    if (!group) {
      group = {
        key: party.key,
        partyName: party.name || NO_BILLING_PARTY_LABEL,
        kind: party.kind,
        unassigned: party.key === "",
        items: [],
      };
      groups.set(party.key, group);
    }
    group.items.push(lr);
  }
  const all = [...groups.values()];
  return [...all.filter((g) => !g.unassigned), ...all.filter((g) => g.unassigned)];
}

/** `/admin/billing/new?...` with the party and LRs preselected. */
export function createBillHref(party: { name: string; kind: BillingPartyKind }, ids: readonly string[]): string {
  const qs = new URLSearchParams({ party: party.name, kind: party.kind, lrs: ids.join(",") });
  return `/admin/billing/new?${qs.toString()}`;
}
