import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyPodAction, canActOnPod, deliveredSince, getPodStatus, isPodCleared, podAgeLevel, podAgeLabel,
  podDaysPending, podHistoryNote, podStatusMatch, pendingPodMatch, rollbackTarget, type PodSnapshot,
} from "./pod-status";

const NOW = new Date("2026-11-03T10:00:00Z");
const delivered = (over: Partial<PodSnapshot> = {}): PodSnapshot => ({ lrStatus: "Delivered", podStatus: "Pending", hasFile: false, ...over });

function ok(r: ReturnType<typeof applyPodAction>) {
  assert.equal(r.ok, true, r.ok ? "" : r.message);
  return r.ok ? r.change : (undefined as never);
}

test("legacy documents without podStatus are Pending", () => {
  assert.equal(getPodStatus({}), "Pending");
  assert.equal(getPodStatus({ podStatus: "bogus" }), "Pending");
  assert.equal(getPodStatus(null), "Pending");
  assert.equal(isPodCleared({}), false);
  assert.equal(isPodCleared({ podStatus: "Received" }), true);
  assert.equal(isPodCleared({ podStatus: "Submitted" }), true);
});

test("POD actions are only allowed on Delivered LRs", () => {
  assert.equal(canActOnPod("Delivered"), true);
  for (const s of ["Booked", "On Route", "Cancelled", undefined]) {
    assert.equal(canActOnPod(s), false);
    for (const action of [{ type: "upload" }, { type: "receive", remark: "x" }, { type: "submit" }, { type: "rollback" }] as const) {
      const r = applyPodAction(delivered({ lrStatus: s, podStatus: "Received" }), action, NOW);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.code, "NOT_DELIVERED");
    }
  }
});

test("uploading a file sets Received, but never downgrades Submitted", () => {
  const c = ok(applyPodAction(delivered({ hasFile: true }), { type: "upload" }, NOW));
  assert.equal(c.to, "Received");
  assert.deepEqual(c.set, { podStatus: "Received", podReceivedAt: NOW });

  const again = ok(applyPodAction(delivered({ podStatus: "Received", hasFile: true }), { type: "upload" }, NOW));
  assert.equal(again.to, "Received");
  assert.deepEqual(again.set, {});

  const submitted = ok(applyPodAction(delivered({ podStatus: "Submitted", hasFile: true }), { type: "upload" }, NOW));
  assert.equal(submitted.to, "Submitted");
  assert.deepEqual(submitted.set, {});
  assert.match(submitted.note, /^POD Submitted: file replaced$/);
});

test("mark Received without a file needs a remark", () => {
  const r = applyPodAction(delivered(), { type: "receive" }, NOW);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "REMARK_REQUIRED");
  const blank = applyPodAction(delivered(), { type: "receive", remark: "   " }, NOW);
  assert.equal(blank.ok, false);

  const c = ok(applyPodAction(delivered(), { type: "receive", remark: "Hard copy with driver" }, NOW));
  assert.equal(c.set.podStatus, "Received");
  assert.equal(c.set.podRemarks, "Hard copy with driver");
  assert.equal(c.note, "POD Pending → Received: Hard copy with driver");
});

test("mark Received with a file needs no remark", () => {
  const c = ok(applyPodAction(delivered({ hasFile: true }), { type: "receive" }, NOW));
  assert.equal(c.to, "Received");
  assert.equal("podRemarks" in c.set, false);
});

test("receive is only valid from Pending", () => {
  for (const podStatus of ["Received", "Submitted"]) {
    const r = applyPodAction(delivered({ podStatus }), { type: "receive", remark: "x" }, NOW);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "INVALID_TRANSITION");
  }
});

test("submit records the date, recipient and note, and needs Received first", () => {
  const pending = applyPodAction(delivered(), { type: "submit" }, NOW);
  assert.equal(pending.ok, false);
  if (!pending.ok) assert.equal(pending.code, "INVALID_TRANSITION");

  const at = new Date("2026-11-02T00:00:00Z");
  const c = ok(applyPodAction(delivered({ podStatus: "Received", podReceivedAt: "2026-11-01T08:00:00Z" }),
    { type: "submit", submittedAt: at, submittedTo: "Tata Motors", note: "Courier AWB 123" }, NOW));
  assert.equal(c.to, "Submitted");
  assert.deepEqual(c.set, { podStatus: "Submitted", podSubmittedAt: at, podSubmittedTo: "Tata Motors", podRemarks: "Courier AWB 123" });
  assert.equal(c.note, "POD Received → Submitted: to Tata Motors — Courier AWB 123");

  const defaults = ok(applyPodAction(delivered({ podStatus: "Received" }), { type: "submit" }, NOW));
  assert.deepEqual(defaults.set, { podStatus: "Submitted", podSubmittedAt: NOW });
});

test("submit validates the date", () => {
  const future = applyPodAction(delivered({ podStatus: "Received" }), { type: "submit", submittedAt: new Date("2026-11-10T00:00:00Z") }, NOW);
  assert.equal(future.ok, false);
  if (!future.ok) assert.equal(future.code, "INVALID_DATE");

  const early = applyPodAction(delivered({ podStatus: "Received", podReceivedAt: "2026-11-01T08:00:00Z" }),
    { type: "submit", submittedAt: new Date("2026-10-20T00:00:00Z") }, NOW);
  assert.equal(early.ok, false);

  const nan = applyPodAction(delivered({ podStatus: "Received" }), { type: "submit", submittedAt: new Date("nope") }, NOW);
  assert.equal(nan.ok, false);

  // Same calendar day as received is fine even if the picked date is midnight.
  const sameDay = applyPodAction(delivered({ podStatus: "Received", podReceivedAt: "2026-11-02T15:00:00Z" }),
    { type: "submit", submittedAt: new Date("2026-11-02T00:00:00Z") }, NOW);
  assert.equal(sameDay.ok, true);
});

test("rollback moves exactly one step back and clears that step's fields", () => {
  const fromSubmitted = ok(applyPodAction(delivered({ podStatus: "Submitted" }), { type: "rollback" }, NOW));
  assert.equal(fromSubmitted.to, "Received");
  assert.deepEqual(fromSubmitted.set, { podStatus: "Received" });
  assert.deepEqual(fromSubmitted.unset, ["podSubmittedAt", "podSubmittedTo"]);

  const fromReceived = ok(applyPodAction(delivered({ podStatus: "Received" }), { type: "rollback" }, NOW));
  assert.equal(fromReceived.to, "Pending");
  assert.deepEqual(fromReceived.unset, ["podReceivedAt"]);

  const pending = applyPodAction(delivered(), { type: "rollback" }, NOW);
  assert.equal(pending.ok, false);

  assert.equal(rollbackTarget("Submitted"), "Received");
  assert.equal(rollbackTarget("Received"), "Pending");
  assert.equal(rollbackTarget("Pending"), null);
});

test("every change produces a history note within the schema limit", () => {
  const long = "x".repeat(500);
  const c = ok(applyPodAction(delivered(), { type: "receive", remark: long }, NOW));
  assert.ok(c.note.length <= 200);
  assert.ok(c.note.startsWith("POD Pending → Received: "));
  assert.ok((c.set.podRemarks as string).length <= 200);
  assert.equal(podHistoryNote("Received", "Received"), "POD Received");
});

test("Mongo matches treat a missing podStatus as Pending", () => {
  assert.deepEqual(podStatusMatch("Received"), { podStatus: "Received" });
  const pending = JSON.stringify(podStatusMatch("Pending"));
  assert.ok(pending.includes("$exists"));
  assert.ok(JSON.stringify(pendingPodMatch()).includes("Delivered"));
});

test("days pending counts from deliveredAt, falling back to history", () => {
  const lr = { status: "Delivered", deliveredAt: "2026-10-30T09:00:00Z" };
  assert.equal(podDaysPending(lr, NOW), 4);
  assert.equal(podDaysPending({ ...lr, deliveredAt: "2026-11-03T09:00:00Z" }, NOW), 0);
  assert.equal(podDaysPending({ ...lr, deliveredAt: "2026-11-05T00:00:00Z" }, NOW), 0); // clock skew never goes negative

  const viaHistory = { status: "Delivered", statusHistory: [
    { status: "Delivered", at: "2026-10-01T00:00:00Z" }, { status: "On Route", at: "2026-10-05T00:00:00Z" }, { status: "Delivered", at: "2026-10-24T10:00:00Z" },
  ] };
  assert.equal(deliveredSince(viaHistory)?.toISOString(), "2026-10-24T10:00:00.000Z");
  assert.equal(podDaysPending(viaHistory, NOW), 10);

  assert.equal(podDaysPending({ status: "Delivered" }, NOW), null); // unknown delivery date
  assert.equal(podDaysPending({ ...lr, podStatus: "Received" }, NOW), null);
  assert.equal(podDaysPending({ ...lr, status: "On Route" }, NOW), null);
});

test("ageing levels and labels", () => {
  assert.equal(podAgeLevel(0), "fresh");
  assert.equal(podAgeLevel(3), "fresh");
  assert.equal(podAgeLevel(4), "aging");
  assert.equal(podAgeLevel(7), "aging");
  assert.equal(podAgeLevel(8), "overdue");
  assert.deepEqual([podAgeLabel(0), podAgeLabel(1), podAgeLabel(9)], ["Today", "1 day", "9 days"]);
});
