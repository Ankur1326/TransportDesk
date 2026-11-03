import test from "node:test";
import assert from "node:assert/strict";
import { getLrStage, getLrCollectionState, stageIndex, emptyStageCounts, LR_STAGES } from "../consignment-stage";

test("legacy LR with no status is Booked", () => {
  assert.equal(getLrStage({}), "Booked");
  assert.equal(getLrStage({ status: null }), "Booked");
  assert.equal(getLrStage({ status: "garbage" }), "Booked");
});

test("lifecycle stages before billing", () => {
  assert.equal(getLrStage({ status: "Booked" }), "Booked");
  assert.equal(getLrStage({ status: "On Route" }), "On Route");
  assert.equal(getLrStage({ status: "Delivered" }), "Delivered");
});

test("Delivered becomes POD Received once POD is in hand", () => {
  assert.equal(getLrStage({ status: "Delivered", podStatus: "Pending" }), "Delivered");
  assert.equal(getLrStage({ status: "Delivered", podStatus: "Received" }), "POD Received");
  assert.equal(getLrStage({ status: "Delivered", podStatus: "Submitted" }), "POD Received");
  assert.equal(getLrStage({ status: "Delivered", podUrl: "https://x/pod.pdf" }), "POD Received"); // legacy file
});

test("POD does not advance an LR that is not Delivered", () => {
  assert.equal(getLrStage({ status: "On Route", podStatus: "Received" }), "On Route");
});

test("Cancelled wins over everything", () => {
  assert.equal(getLrStage({ status: "Cancelled", podStatus: "Received" }, { status: "Paid" }), "Cancelled");
  assert.equal(getLrStage({ status: "Cancelled", billing: { billed: true } }), "Cancelled");
});

test("billing stages come from the bill", () => {
  const lr = { status: "Delivered", podStatus: "Received" };
  assert.equal(getLrStage(lr, { status: "Unpaid" }), "Billed");
  assert.equal(getLrStage(lr, { status: "Partial" }), "Partially Paid");
  assert.equal(getLrStage(lr, { status: "Paid" }), "Paid");
});

test("a bill beats the LR's own denormalised flag", () => {
  assert.equal(getLrStage({ status: "Delivered", billing: { billed: false } }, { status: "Paid" }), "Paid");
});

test("billed LR without a bill object falls back to billing.billed", () => {
  assert.equal(getLrStage({ status: "Delivered", billing: { billed: true } }), "Billed");
  assert.equal(getLrStage({ status: "Delivered", billing: { billed: false } }), "Delivered");
  assert.equal(getLrStage({ status: "Delivered", billing: null }), "Delivered");
});

test("billed even if POD was never recorded (billing allowed with a warning)", () => {
  assert.equal(getLrStage({ status: "Delivered" }, { status: "Unpaid" }), "Billed");
  assert.equal(getLrStage({ status: "Booked" }, { status: "Partial" }), "Partially Paid");
});

test("collection state", () => {
  assert.equal(getLrCollectionState({}), "Unbilled");
  assert.equal(getLrCollectionState({ billing: { billed: true } }), "Billed");
  assert.equal(getLrCollectionState({}, { status: "Partial" }), "Partially paid");
  assert.equal(getLrCollectionState({}, { status: "Paid" }), "Paid");
  assert.equal(getLrCollectionState({}, null), "Unbilled");
});

test("stageIndex and counts helper", () => {
  assert.equal(stageIndex("Booked"), 0);
  assert.equal(stageIndex("Paid"), 6);
  assert.equal(stageIndex("Cancelled"), -1);
  const c = emptyStageCounts();
  assert.equal(Object.keys(c).length, LR_STAGES.length);
  assert.ok(Object.values(c).every((n) => n === 0));
});

test("tallyStages", async () => {
  const { tallyStages } = await import("../consignment-stage");
  const c = tallyStages([{ stage: "Paid" }, { stage: "Paid" }, { stage: "Booked" }]);
  assert.equal(c.Paid, 2);
  assert.equal(c.Booked, 1);
  assert.equal(c.Cancelled, 0);
  assert.equal(Object.values(tallyStages([])).reduce((a, b) => a + b, 0), 0);
});

test("an explicit podStatus beats a stray podUrl; a missing one defers to podUrl", () => {
  assert.equal(getLrStage({ status: "Delivered", podStatus: "Pending", podUrl: "u" }), "Delivered");
  assert.equal(getLrStage({ status: "Delivered", podStatus: undefined, podUrl: "" }), "Delivered");
  assert.equal(getLrStage({ status: "Delivered", podUrl: "u" }), "POD Received");
});
