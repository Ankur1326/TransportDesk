import test from "node:test";
import assert from "node:assert/strict";
import {
  diffLrIds, buildBillingMarker, markersFromBills, sameMarker, billedLrMessage, removeFromPaidBillMessage, isBilledMarker,
} from "../lr-billing";

test("diffLrIds splits added / removed / kept and de-duplicates", () => {
  const d = diffLrIds(["a", "b", "c"], ["b", "c", "d", "d"]);
  assert.deepEqual(d.added, ["d"]);
  assert.deepEqual(d.removed, ["a"]);
  assert.deepEqual(d.kept.sort(), ["b", "c"]);
});

test("diffLrIds handles create (no previous) and delete (no next)", () => {
  assert.deepEqual(diffLrIds([], ["x", "y"]).added, ["x", "y"]);
  assert.deepEqual(diffLrIds(["x", "y"], []).removed, ["x", "y"]);
  assert.deepEqual(diffLrIds([], []), { added: [], removed: [], kept: [] });
});

test("buildBillingMarker", () => {
  const m = buildBillingMarker({ id: "b1", billNo: "B-1", billDate: "2026-10-01T00:00:00Z" });
  assert.equal(m.billed, true);
  assert.equal(m.billId, "b1");
  assert.equal(m.billNo, "B-1");
  assert.equal(m.billedAt?.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal("billedAt" in buildBillingMarker({ id: "b", billNo: "x", billDate: "nope" }), false);
  assert.equal("billedAt" in buildBillingMarker({ id: "b", billNo: "x" }), false);
});

test("isBilledMarker tolerates legacy LRs", () => {
  assert.equal(isBilledMarker(undefined), false);
  assert.equal(isBilledMarker(null), false);
  assert.equal(isBilledMarker({}), false);
  assert.equal(isBilledMarker({ billed: false }), false);
  assert.equal(isBilledMarker({ billed: true }), true);
});

test("markersFromBills: latest bill wins when an LR is on two bills", () => {
  const map = markersFromBills([
    { id: "b2", billNo: "B-2", billDate: "2026-10-05", lrIds: ["l1", "l2"] },
    { id: "b1", billNo: "B-1", billDate: "2026-10-01", lrIds: ["l1"] },
  ]);
  assert.equal(map.get("l1")?.billId, "b2");
  assert.equal(map.get("l2")?.billId, "b2");
  assert.equal(map.has("l3"), false);
});

test("sameMarker", () => {
  const m = buildBillingMarker({ id: "b1", billNo: "B-1", billDate: "2026-10-01" });
  assert.equal(sameMarker(undefined, undefined), true);
  assert.equal(sameMarker({ billed: false }, undefined), true);
  assert.equal(sameMarker(undefined, m), false);
  assert.equal(sameMarker(m, m), true);
  assert.equal(sameMarker({ ...m, billNo: "B-9" }, m), false);
  assert.equal(sameMarker({ ...m, billedAt: new Date("2026-10-02") }, m), false);
});

test("error messages name the bill and LR", () => {
  assert.match(billedLrMessage("101", "B-7", "cancelled"), /LR 101.*B-7.*cancelled/);
  assert.match(billedLrMessage("101", undefined, "deleted"), /a freight bill/);
  assert.match(removeFromPaidBillMessage("B-7", ["1", "2"]), /Bill B-7.*LR 1, 2/);
  assert.match(removeFromPaidBillMessage("B-7", ["1", "2", "3", "4", "5"]), /and 2 more/);
});
