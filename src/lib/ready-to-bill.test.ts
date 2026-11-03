import { test } from "node:test";
import assert from "node:assert/strict";
import { billingPartyOf, createBillHref, groupByBillingParty, isReadyToBill, NO_BILLING_PARTY_LABEL } from "./ready-to-bill";

const lr = (id: string, billingParty: string | undefined, over: Record<string, unknown> = {}) => ({
  _id: id,
  consignor: { name: "Alpha Traders" },
  consignee: { name: "Beta Steel" },
  payment: billingParty === undefined ? undefined : { billingParty, billingAccount: "" },
  ...over,
});

test("billing party follows payment.billingParty; legacy LRs bill the consignor", () => {
  assert.equal(billingPartyOf(lr("1", "Consignor")).name, "Alpha Traders");
  assert.equal(billingPartyOf(lr("2", "Consignee")).name, "Beta Steel");
  assert.equal(billingPartyOf(lr("3", undefined)).kind, "Consignor");
  assert.equal(billingPartyOf(lr("3", "")).name, "Alpha Traders");
  const third = billingPartyOf({ ...lr("4", "Third Party"), payment: { billingParty: "Third Party", billingAccount: "  Gamma Logistics " } });
  assert.deepEqual(third, { key: "gamma logistics", name: "Gamma Logistics", kind: "Third Party" });
  assert.equal(billingPartyOf(lr("5", "Third Party")).key, "");
});

test("ready to bill = Delivered + POD in hand + not billed", () => {
  const billed = new Set(["9"]);
  assert.equal(isReadyToBill({ _id: "1", status: "Delivered", podStatus: "Received" }, billed), true);
  assert.equal(isReadyToBill({ _id: "1", status: "Delivered", podStatus: "Submitted" }, billed), true);
  assert.equal(isReadyToBill({ _id: "1", status: "Delivered", podStatus: "Pending" }, billed), false);
  assert.equal(isReadyToBill({ _id: "1", status: "Delivered" }, billed), false); // legacy
  assert.equal(isReadyToBill({ _id: "1", status: "On Route", podStatus: "Received" }, billed), false);
  assert.equal(isReadyToBill({ _id: "1", status: "Cancelled", podStatus: "Received" }, billed), false);
  assert.equal(isReadyToBill({ _id: "9", status: "Delivered", podStatus: "Received" }, billed), false);
});

test("groups by billing party case-insensitively and keeps first-seen order", () => {
  const groups = groupByBillingParty([
    lr("1", "Consignor"),
    lr("2", "Consignee"),
    lr("3", "Consignor", { consignor: { name: " alpha traders " } }),
    lr("4", "Consignee"),
  ]);
  assert.deepEqual(groups.map((g) => [g.partyName, g.items.map((i) => i._id)]), [
    ["Alpha Traders", ["1", "3"]],
    ["Beta Steel", ["2", "4"]],
  ]);
});

test("LRs with no billing party go to a last, unassigned group", () => {
  const groups = groupByBillingParty([
    lr("1", "Third Party"),
    lr("2", "Consignor"),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].partyName, "Alpha Traders");
  assert.equal(groups[1].partyName, NO_BILLING_PARTY_LABEL);
  assert.equal(groups[1].unassigned, true);
  assert.deepEqual(groupByBillingParty([]), []);
});

test("create-bill link carries the party and LR ids", () => {
  const href = createBillHref({ name: "Alpha & Sons", kind: "Consignee" }, ["a", "b"]);
  const url = new URL(href, "http://x");
  assert.equal(url.pathname, "/admin/billing/new");
  assert.equal(url.searchParams.get("party"), "Alpha & Sons");
  assert.equal(url.searchParams.get("kind"), "Consignee");
  assert.equal(url.searchParams.get("lrs"), "a,b");
});
