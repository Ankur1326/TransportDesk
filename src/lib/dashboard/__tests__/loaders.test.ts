import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actionSettingsMatch,
  activityCompanyMatch,
  activityPaymentMatch,
  billPeriodMatch,
  bookingPeriodMatch,
  financialsBillMatch,
  financialsHireMatch,
  lhcCompanyMatch,
  liveHirePaymentMatch,
  payablesPartyMatch,
  paymentPeriodMatch,
  pipelineCompanyMatch,
  receivablesPartyMatch,
  trendCompanyMatch,
} from "../loader-scopes";
import { sumUnmirroredHirePayments } from "../money";
import { isLiveStatus, legacyLrStatus } from "../money";
import { legacyLrStatusExpression, notCancelledMatch } from "../status";
import type { DashboardRange } from "../shared";

const range: DashboardRange = {
  from: new Date("2026-11-01T00:00:00Z"),
  to: new Date("2026-12-01T00:00:00Z"),
  previousFrom: new Date("2026-10-01T00:00:00Z"),
  previousTo: new Date("2026-11-01T00:00:00Z"),
};

function assertCompanyScope(query: unknown, companyId = "tenant-a") {
  assert.deepEqual(query, { companyId });
}

test("each dashboard loader query builder carries its tenant scope", () => {
  const companyId = "tenant-a";
  assert.deepEqual(actionSettingsMatch(companyId), { ownerId: companyId });
  assertCompanyScope(bookingPeriodMatch(companyId, range).$and[0]);
  assertCompanyScope(billPeriodMatch(companyId, range).$and[0]);
  assertCompanyScope(financialsBillMatch(companyId, range).$and[0]);
  assertCompanyScope(financialsHireMatch(companyId, range).$and[0]);
  assertCompanyScope(paymentPeriodMatch(companyId, range, "received").$and[0]);
  assertCompanyScope(liveHirePaymentMatch(companyId, range).$and[0]);
  assertCompanyScope(receivablesPartyMatch(companyId).$and[0]);
  assertCompanyScope(payablesPartyMatch(companyId).$and[0]);
  assertCompanyScope(pipelineCompanyMatch(companyId).$and[0]);
  assertCompanyScope(lhcCompanyMatch(companyId).$and[0]);
  assertCompanyScope(activityCompanyMatch(companyId).$and[0]);
  assertCompanyScope(activityPaymentMatch(companyId).$and[0]);
  assertCompanyScope(trendCompanyMatch(companyId, range.from, range.to, "billDate").$and[0]);
});

test("KPI scoping preserves cancelled exclusion and legacy LR status semantics", () => {
  const bookingMatch = bookingPeriodMatch("tenant-a", range);
  const bookingFilters = bookingMatch.$and[1] as {
    status: { $ne: string };
    createdAt: { $gte: Date; $lt: Date };
  };
  assert.deepEqual(bookingFilters.status, { $ne: "Cancelled" });
  assert.equal(bookingFilters.createdAt.$gte, range.previousFrom);
  assert.equal(bookingFilters.createdAt.$lt, range.to);
  assert.deepEqual(notCancelledMatch(), { status: { $ne: "Cancelled" } });
  assert.equal(isLiveStatus("Cancelled"), false);
  assert.equal(isLiveStatus(undefined), true);
  assert.equal(legacyLrStatus(undefined), "Booked");
  assert.deepEqual(legacyLrStatusExpression(), { $ifNull: ["$status", "Booked"] });
  assert.deepEqual(liveHirePaymentMatch("tenant-a", range).$and[1], {
    status: { $ne: "Cancelled" },
    "payments.date": { $gte: range.previousFrom, $lt: range.to },
  });
});

test("embedded LHC payments count only when the matching mirrored payment is absent", () => {
  const totals = sumUnmirroredHirePayments(
    [
      { amount: 10.25, date: new Date("2026-11-02T00:00:00Z"), ledgerPaymentId: "mirror-1" },
      { amount: 4.5, date: new Date("2026-11-03T00:00:00Z"), ledgerPaymentId: "missing-mirror" },
      { amount: 7, date: new Date("2026-10-02T00:00:00Z") },
      { amount: 100, date: new Date("2026-09-01T00:00:00Z") },
    ],
    new Set(["mirror-1"]),
    range
  );
  assert.deepEqual(totals, { current: 4.5, previous: 7 });
});
