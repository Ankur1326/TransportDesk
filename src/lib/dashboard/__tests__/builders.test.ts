import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDelta, deltaTone, NO_DELTA } from "../build-deltas";
import { buildPartySnapshot, mergeAgeing, overdueFromAgeing, type PartyLedgerInput } from "../build-ageing";
import { buildActions, type ActionInputs } from "../build-actions";
import { buildActivity, describeActivity, type RawActivity } from "../build-activity";
import { buildCollectionSeries, buildRevenueSeries } from "../build-trends";
import { collectionBuckets, resolvePeriod, revenueBuckets } from "../periods";
import { computeAgeing } from "@/lib/ledger/ageing";
import type { LhcStrip, OperationsFacts } from "../types";

const NOW = new Date("2026-11-03T06:30:00Z"); // 12:00 IST
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

/* ---------------------------------- deltas --------------------------------- */

test("delta: up, down, flat and rounding", () => {
  assert.deepEqual(computeDelta(150, 100), { direction: "up", pct: 50, isNew: false });
  assert.deepEqual(computeDelta(75, 100), { direction: "down", pct: -25, isNew: false });
  assert.deepEqual(computeDelta(100, 100), { direction: "flat", pct: 0, isNew: false });
  assert.deepEqual(computeDelta(100.01, 100), { direction: "flat", pct: 0, isNew: false }, "0.01% is flat");
  assert.equal(computeDelta(1, 3).pct, -66.7);
});

test("delta: divide by zero never produces Infinity or NaN", () => {
  assert.deepEqual(computeDelta(500, 0), { direction: "up", pct: null, isNew: true });
  assert.deepEqual(computeDelta(0, 0), { direction: "flat", pct: 0, isNew: false });
  assert.deepEqual(computeDelta(-5, 0), { direction: "down", pct: null, isNew: true });
});

test("delta: a missing previous value gives no delta", () => {
  assert.deepEqual(computeDelta(100, null), NO_DELTA);
  assert.deepEqual(computeDelta(100, undefined), NO_DELTA);
  assert.deepEqual(computeDelta(100, Number.NaN), NO_DELTA);
  assert.deepEqual(computeDelta(Number.POSITIVE_INFINITY, 10), NO_DELTA);
});

test("delta: a loss that shrinks reads as an improvement", () => {
  const d = computeDelta(-50, -100);
  assert.equal(d.direction, "up");
  assert.equal(d.pct, 50);
  assert.equal(computeDelta(-150, -100).direction, "down");
});

test("delta tone: depends on whether higher or lower is better", () => {
  const up = computeDelta(150, 100);
  const down = computeDelta(50, 100);
  assert.equal(deltaTone(up, "higher"), "good");
  assert.equal(deltaTone(down, "higher"), "bad");
  assert.equal(deltaTone(up, "lower"), "bad");
  assert.equal(deltaTone(down, "lower"), "good");
  assert.equal(deltaTone(up, "neutral"), "neutral");
  assert.equal(deltaTone(NO_DELTA, "higher"), "neutral");
  assert.equal(deltaTone(computeDelta(1, 1), "higher"), "neutral");
});

/* ---------------------------------- ageing --------------------------------- */

test("mergeAgeing adds buckets without float drift", () => {
  const a = computeAgeing([{ billDate: daysAgo(5), outstanding: 0.1 }, { billDate: daysAgo(100), outstanding: 10 }], NOW);
  const b = computeAgeing([{ billDate: daysAgo(5), outstanding: 0.2 }, { billDate: daysAgo(45), outstanding: 20.5 }], NOW);
  const m = mergeAgeing([a, b]);
  assert.deepEqual(m.buckets.map((x) => [x.key, x.amount, x.count]), [
    ["0-30", 0.3, 2], ["31-60", 20.5, 1], ["61-90", 0, 0], ["90+", 10, 1],
  ]);
  assert.equal(m.total, 30.8);
  assert.equal(overdueFromAgeing(m), 30.5);
});

test("mergeAgeing of nothing is four empty buckets", () => {
  const m = mergeAgeing([]);
  assert.equal(m.buckets.length, 4);
  assert.equal(m.total, 0);
  assert.equal(overdueFromAgeing(m), 0);
});

const party = (id: string, name: string, net: number, docs: { d: number; out: number }[] = []): PartyLedgerInput => ({
  id, name, net, documents: docs.map((x) => ({ billDate: daysAgo(x.d), outstanding: x.out })),
});

test("party snapshot: totals only count positive balances, advances are reported separately", () => {
  const s = buildPartySnapshot(
    [party("a", "Alpha", 1000.5), party("b", "Beta", -300), party("c", "Gamma", 0), party("d", "Delta", 499.5)],
    { now: NOW }
  );
  assert.equal(s.total, 1500);
  assert.equal(s.advances, 300);
  assert.equal(s.partyCount, 4);
  assert.equal(s.owingCount, 2);
  assert.deepEqual(s.top.map((p) => p.name), ["Alpha", "Delta"]);
  assert.equal(s.overdueDocs, null, "suppliers do not get overdue docs");
});

test("party snapshot: top 5 sorted by amount, ties by name, parties not owing excluded", () => {
  const parties = ["g", "f", "e", "d", "c", "b", "a"].map((n, i) => party(n, `P-${n}`, i < 2 ? 500 : 100 * (i + 1)));
  const s = buildPartySnapshot([...parties, party("z", "Zero", 0)], { now: NOW });
  assert.equal(s.top.length, 5);
  // nets: g=500 f=500 e=300 d=400 c=500 b=600 a=700 -> the three 500s tie and sort by name
  assert.deepEqual(s.top.map((p) => p.amount), [700, 600, 500, 500, 500]);
  assert.deepEqual(s.top.slice(2).map((p) => p.name), ["P-c", "P-f", "P-g"]);
});

test("party snapshot: ageing covers owing parties only and unaged is the reconciling difference", () => {
  const s = buildPartySnapshot(
    [
      // owes 1000: 600 on a recent bill, 300 on a 70-day-old bill, 100 is opening balance (no invoice date)
      party("a", "Alpha", 1000, [{ d: 10, out: 600 }, { d: 70, out: 300 }]),
      // in credit overall: its stray open invoice must NOT inflate the strip
      party("b", "Beta", -50, [{ d: 200, out: 999 }]),
    ],
    { now: NOW }
  );
  assert.equal(s.ageing.total, 900);
  assert.equal(s.unaged, 100);
  assert.equal(s.overdue, 300);
  assert.equal(s.ageing.buckets.find((b) => b.key === "61-90")?.amount, 300);
});

test("party snapshot: overdue docs use IST days and the credit-day limit (strictly more than N)", () => {
  const s = buildPartySnapshot(
    [party("a", "Alpha", 2000, [{ d: 30, out: 100 }, { d: 31, out: 400 }, { d: 90, out: 500 }, { d: 60, out: 0 }])],
    { now: NOW, overdueDocsAfterDays: 30 }
  );
  assert.deepEqual(s.overdueDocs, { count: 2, amount: 900 });
  const lenient = buildPartySnapshot([party("a", "Alpha", 2000, [{ d: 31, out: 400 }])], { now: NOW, overdueDocsAfterDays: 45 });
  assert.deepEqual(lenient.overdueDocs, { count: 0, amount: 0 });
});

test("party snapshot: partial flag is passed through and an empty company is all zeros", () => {
  const s = buildPartySnapshot([], { now: NOW, partial: true, overdueDocsAfterDays: 30 });
  assert.equal(s.total, 0);
  assert.equal(s.partial, true);
  assert.deepEqual(s.top, []);
  assert.deepEqual(s.overdueDocs, { count: 0, amount: 0 });
});

/* --------------------------------- actions --------------------------------- */

const ops = (over: Partial<OperationsFacts> = {}): OperationsFacts => ({
  pipeline: { booked: 0, onRoute: 0, delivered30d: 0, pendingPod: 0, readyToBill: 0 },
  podPending: { count: 0, oldestDays: null },
  readyToBill: { count: 0, estimatedFreight: 0 },
  onRouteOverdue: 0,
  eway: { count: 0, expired: 0 },
  documents: { source: "lorry-hire-contracts", expired: 0, expiringSoon: 0, items: [], unavailable: [] },
  ...over,
});
const lhc = (over: Partial<LhcStrip> = {}): LhcStrip => ({
  hired: 0, inTransit: 0, delivered: 0, cancelled: 0, balanceDueOnDelivered: 0, deliveredWithBalance: 0, ...over,
});
const inputs = (over: Partial<ActionInputs> = {}): ActionInputs => ({
  ops: ops(), lhc: lhc(), receivables: { overdueDocs: { count: 0, amount: 0 } }, creditDays: 30, ...over,
});

test("actions: zero counts are hidden and nothing unavailable means all caught up", () => {
  const r = buildActions(inputs());
  assert.deepEqual(r, { items: [], unavailable: [] });
});

test("actions: ordered by urgency, then by a stable id order", () => {
  const r = buildActions(
    inputs({
      ops: ops({
        podPending: { count: 4, oldestDays: 12 },
        readyToBill: { count: 3, estimatedFreight: 125000 },
        onRouteOverdue: 2,
        eway: { count: 1, expired: 0 },
        documents: { source: "lorry-hire-contracts", expired: 1, expiringSoon: 2, items: [], unavailable: [] },
      }),
      lhc: lhc({ balanceDueOnDelivered: 80000, deliveredWithBalance: 2 }),
      receivables: { overdueDocs: { count: 5, amount: 250000 } },
    })
  );
  assert.deepEqual(r.items.map((i) => [i.id, i.urgency]), [
    ["eway", "critical"],
    ["overdue-bills", "critical"],
    ["documents", "critical"],
    ["late-trips", "high"],
    ["supplier-dues", "high"],
    ["pod-pending", "high"],
    ["ready-to-bill", "medium"],
  ]);
  assert.equal(r.unavailable.length, 0);
});

test("actions: POD urgency escalates only after 7 days", () => {
  const urgency = (days: number | null) =>
    buildActions(inputs({ ops: ops({ podPending: { count: 2, oldestDays: days } }) })).items[0].urgency;
  assert.equal(urgency(7), "medium");
  assert.equal(urgency(8), "high");
  assert.equal(urgency(null), "medium");
});

test("actions: card text and amounts", () => {
  const r = buildActions(
    inputs({
      ops: ops({ readyToBill: { count: 1, estimatedFreight: 1234567 } }),
      receivables: { overdueDocs: { count: 1, amount: 45000 } },
      creditDays: 45,
    })
  );
  const rtb = r.items.find((i) => i.id === "ready-to-bill")!;
  assert.match(rtb.description, /₹12,34,567/);
  assert.equal(rtb.amount, 1234567);
  assert.equal(rtb.href, "/admin/billing/ready-to-bill");
  const od = r.items.find((i) => i.id === "overdue-bills")!;
  assert.match(od.description, /1 bill is unpaid more than 45 days/);
});

test("actions: documents card is critical only when something already expired", () => {
  const docs = (expired: number, soon: number) =>
    buildActions(inputs({ ops: ops({ documents: { source: "lorry-hire-contracts", expired, expiringSoon: soon, items: [], unavailable: [] } }) })).items[0];
  assert.equal(docs(0, 3).urgency, "medium");
  assert.equal(docs(0, 3).title, "Documents expiring soon");
  assert.equal(docs(2, 0).urgency, "critical");
  assert.equal(docs(2, 1).count, 3);
});

test("actions: unavailable sources are reported and never claimed as caught up", () => {
  const r = buildActions({ ops: null, lhc: null, receivables: null, creditDays: 30 });
  assert.deepEqual(r.items, []);
  assert.deepEqual([...r.unavailable].sort(), ["documents", "eway", "late-trips", "overdue-bills", "pod-pending", "ready-to-bill", "supplier-dues"]);
});

test("actions: a missing optional feature only skips its own card", () => {
  const r = buildActions(inputs({ ops: ops({ podPending: null, documents: null, onRouteOverdue: 3 }) }));
  assert.deepEqual([...r.unavailable].sort(), ["documents", "pod-pending"]);
  assert.deepEqual(r.items.map((i) => i.id), ["late-trips"]);
});

test("actions: supplier dues need both a count and a balance", () => {
  assert.equal(buildActions(inputs({ lhc: lhc({ deliveredWithBalance: 2, balanceDueOnDelivered: 0 }) })).items.length, 0);
  assert.equal(buildActions(inputs({ lhc: lhc({ deliveredWithBalance: 0, balanceDueOnDelivered: 500 }) })).items.length, 0);
});

test("actions: e-way wording distinguishes expired from expiring", () => {
  const text = (count: number, expired: number) =>
    buildActions(inputs({ ops: ops({ eway: { count, expired } }) })).items[0].description;
  assert.match(text(2, 0), /expire within 24 hours/);
  assert.match(text(2, 2), /have expired/);
  assert.match(text(3, 1), /1 already expired/);
});

/* --------------------------------- activity -------------------------------- */

test("activity: merged newest first, capped at 10, one-line text with rupee formatting", () => {
  const events: RawActivity[] = [
    { type: "bill_created", id: "b1", at: "2026-11-03T05:00:00Z", billNo: "B-102", party: "ABC Traders", amount: 45000 },
    { type: "payment", id: "p1", at: "2026-11-03T06:00:00Z", direction: "received", amount: 1200000, party: "XYZ Ltd", partyType: "customer" },
    { type: "payment", id: "p2", at: "2026-11-03T04:00:00Z", direction: "paid", amount: 500, party: "Sharma Roadlines", partyType: "supplier" },
    { type: "lhc_created", id: "h1", at: "2026-11-02T04:00:00Z", lhcNo: "LHC-7", supplier: "Sharma Roadlines", vehicle: "RJ14GA1234" },
    { type: "lr_created", id: "l1", at: "2026-11-01T04:00:00Z", lrNo: "1001", consignor: "ABC Traders", to: "Delhi" },
    { type: "lr_status", id: "l1", at: "2026-11-02T10:00:00Z", lrNo: "1001", status: "Delivered" },
    ...Array.from({ length: 12 }, (_, i): RawActivity => ({ type: "lr_created", id: `x${i}`, at: `2026-10-${10 + i}T00:00:00Z`, lrNo: String(i) })),
  ];
  const out = buildActivity(events);
  assert.equal(out.length, 10);
  assert.equal(out[0].text, "₹12,00,000 received from XYZ Ltd");
  assert.equal(out[1].text, "Bill B-102 created for ABC Traders · ₹45,000");
  assert.equal(out[2].text, "₹500 paid to Sharma Roadlines");
  assert.equal(out[3].text, "LR 1001 marked Delivered");
  assert.equal(out[4].text, "Contract LHC-7 created with Sharma Roadlines · RJ14GA1234");
  assert.equal(out[5].text, "LR 1001 booked for ABC Traders · to Delhi");
  assert.deepEqual(out.map((o) => o.at), [...out.map((o) => o.at)].sort().reverse());
});

test("activity: duplicates and unreadable timestamps are dropped, POD notes read naturally", () => {
  const e: RawActivity = { type: "bill_created", id: "b1", at: "2026-11-03T05:00:00Z", billNo: "B-1", amount: 1 };
  const out = buildActivity([e, e, { ...e, id: "b2", at: "not a date" }]);
  assert.equal(out.length, 1);
  const pod = describeActivity({ type: "lr_status", id: "l", at: "2026-11-03T05:00:00Z", lrNo: "55", status: "Delivered", note: "POD Pending → Received: file uploaded" });
  assert.equal(pod.text, "LR 55 · POD Pending → Received: file uploaded");
  assert.equal(describeActivity({ type: "payment", id: "p", at: "2026-11-03T05:00:00Z", direction: "received", amount: 10, partyType: "customer" }).text, "₹10 received");
});

test("activity: payment link goes to the right ledger", () => {
  const base = { type: "payment" as const, id: "p", at: "2026-11-03T05:00:00Z", amount: 1 };
  assert.equal(describeActivity({ ...base, direction: "paid", partyType: "supplier" }).href, "/admin/suppliers");
  assert.equal(describeActivity({ ...base, direction: "received", partyType: "customer" }).href, "/admin/customers");
});

/* ---------------------------------- trends --------------------------------- */

test("revenue series: fills empty months, ignores rows outside the buckets", () => {
  const p = resolvePeriod("month", NOW);
  assert.ok(p.ok);
  const buckets = revenueBuckets(p.period, NOW);
  const s = buildRevenueSeries(
    buckets,
    [{ key: "2026-11", amount: 100.1 }, { key: "2026-11", amount: 0.2 }, { key: "2026-09", amount: 50 }, { key: "2019-01", amount: 9999 }],
    [{ key: "2026-10", amount: 70 }]
  );
  assert.equal(s.length, 6);
  assert.deepEqual(s.map((x) => [x.key, x.revenue, x.cost]), [
    ["2026-06", 0, 0], ["2026-07", 0, 0], ["2026-08", 0, 0], ["2026-09", 50, 0], ["2026-10", 0, 70], ["2026-11", 100.3, 0],
  ]);
});

test("collection series: days roll into weeks by IST day", () => {
  const p = resolvePeriod("custom", NOW, { from: "2026-10-01", to: "2026-11-15" });
  assert.ok(p.ok);
  const { buckets } = collectionBuckets(p.period);
  const s = buildCollectionSeries(buckets, [
    { key: "2026-10-01", amount: 10 },
    { key: "2026-10-04", amount: 5 }, // Sunday: still the week that started 1 Oct (clipped)
    { key: "2026-10-05", amount: 7 }, // Monday: next week
    { key: "2026-11-15", amount: 1 },
    { key: "2026-12-30", amount: 999 }, // outside
    { key: "garbage", amount: 999 },
  ]);
  assert.equal(s[0].amount, 15);
  assert.equal(s[1].amount, 7);
  assert.equal(s.at(-1)?.amount, 1);
  assert.equal(s.reduce((t, x) => t + x.amount, 0), 23);
});
