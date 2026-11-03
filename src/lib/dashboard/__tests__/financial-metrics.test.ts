import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLorryHireSummary } from "@/lib/lorry-hire/calculations";
import { computeDelta, deltaTone } from "../build-deltas";
import { buildFinancialSeries } from "../build-trends";
import { buildFinancials, taxableBillRevenue } from "../financial-metrics";
import { financialsBillMatch, financialsHireMatch } from "../loader-scopes";
import { resolvePeriod, periodMonthBuckets } from "../periods";
import type { DashboardRange } from "../shared";

const range: DashboardRange = {
  from: new Date("2026-11-01T00:00:00.000Z"),
  to: new Date("2026-12-01T00:00:00.000Z"),
  previousFrom: new Date("2026-10-01T00:00:00.000Z"),
  previousTo: new Date("2026-11-01T00:00:00.000Z"),
};

test("revenue uses the stored bill charges less discount, excluding GST and ignoring TDS", () => {
  const taxable = taxableBillRevenue(10_000, {
    discount: 1_250,
    gstMode: "GST",
    gstRate: 18,
    tdsMode: "Deduction",
    tdsRate: 2,
    advanceReceived: 500,
    roundOff: true,
  });
  assert.equal(taxable, 8_750);
});

test("RCM and no-GST bills have the same taxable revenue", () => {
  const none = taxableBillRevenue(20_000, { discount: 500, gstMode: "None", gstRate: 0 });
  const rcm = taxableBillRevenue(20_000, { discount: 500, gstMode: "RCM", gstRate: 5 });
  assert.equal(none, 19_500);
  assert.equal(rcm, none);
});

test("financial bill scope excludes cancelled bills and bounds both comparison periods", () => {
  const match = financialsBillMatch("tenant-a", range);
  assert.deepEqual(match.$and[0], { companyId: "tenant-a" });
  const filter = match.$and[1] as { status: { $ne: string }; $or: { billDate: { $gte: Date; $lt: Date } }[] };
  assert.deepEqual(filter.status, { $ne: "Cancelled" });
  assert.deepEqual(filter.$or, [
    { billDate: { $gte: range.from, $lt: range.to } },
    { billDate: { $gte: range.previousFrom, $lt: range.previousTo } },
  ]);
});

test("hire expense uses gross hire after additions and deductions, without GST or TDS", () => {
  const settlement = computeLorryHireSummary({
    rate: 1_000,
    charges: [
      { kind: "add", amount: 250 },
      { kind: "deduct", amount: 50 },
    ],
    gstMode: "RCM",
    tdsMode: "Deduction",
    tdsRate: 2,
  });
  assert.equal(settlement.grossHire, 1_200);
  assert.equal(settlement.tdsAmount, 24);
  const result = buildFinancials(
    { current: 2_000, previous: 1_500 },
    [{ key: "lorryHire", label: "Lorry hire cost", current: settlement.grossHire, previous: 800 }]
  );
  assert.equal(result.expenses.total.value, 1_200);
  assert.equal(result.netProfit.value, 800);
});

test("financial hire scope excludes cancelled contracts and uses the selected date range", () => {
  const match = financialsHireMatch("tenant-a", range);
  assert.deepEqual(match.$and[0], { companyId: "tenant-a" });
  const filter = match.$and[1] as { status: { $ne: string }; $or: { lhcDate: { $gte: Date; $lt: Date } }[] };
  assert.deepEqual(filter.status, { $ne: "Cancelled" });
  assert.deepEqual(filter.$or, [
    { lhcDate: { $gte: range.from, $lt: range.to } },
    { lhcDate: { $gte: range.previousFrom, $lt: range.previousTo } },
  ]);
});

test("net profit handles zero revenue and negative profit", () => {
  const noRevenue = buildFinancials(
    { current: 0, previous: 0 },
    [{ key: "lorryHire", label: "Lorry hire cost", current: 100, previous: 0 }]
  );
  assert.equal(noRevenue.netProfit.value, -100);
  assert.equal(noRevenue.marginPct, null);

  const loss = buildFinancials(
    { current: 100, previous: 0 },
    [{ key: "lorryHire", label: "Lorry hire cost", current: 250, previous: 0 }]
  );
  assert.equal(loss.netProfit.value, -150);
  assert.equal(loss.marginPct, -150);
});

test("expense increases are adverse, decreases are favorable, and missing comparison stays unavailable", () => {
  assert.equal(deltaTone(computeDelta(120, 100), "lower"), "bad");
  assert.equal(deltaTone(computeDelta(80, 100), "lower"), "good");
  assert.equal(computeDelta(50, null).pct, null);
});

test("selected-period monthly trend sums reconcile to revenue, expenses and net profit KPIs", () => {
  const resolved = resolvePeriod("custom", new Date("2026-11-03T06:30:00Z"), {
    from: "2026-10-28",
    to: "2026-11-03",
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;

  const buckets = periodMonthBuckets(resolved.period);
  const revenueRows = [
    { key: "2026-10", amount: 120 },
    { key: "2026-11", amount: 180 },
  ];
  const expenseRows = [
    { key: "2026-10", amount: 50 },
    { key: "2026-11", amount: 50 },
  ];
  const trend = buildFinancialSeries(buckets, revenueRows, expenseRows);
  const kpis = buildFinancials(
    { current: 300, previous: 200 },
    [{ key: "lorryHire", label: "Lorry hire cost", current: 100, previous: 50 }]
  );

  assert.equal(trend.reduce((sum, point) => sum + point.revenue, 0), kpis.revenue.value);
  assert.equal(trend.reduce((sum, point) => sum + point.expenses, 0), kpis.expenses.total.value);
  assert.equal(trend.reduce((sum, point) => sum + point.netProfit, 0), kpis.netProfit.value);
});
