import { companyFilter } from "@/lib/company-filter";
import type { DashboardRange } from "@/lib/dashboard/shared";
import { notCancelledMatch } from "@/lib/dashboard/status";

export const setupPartyMatch = (companyId: string) => ({ $and: [companyFilter(companyId), {}] });
export const actionSettingsMatch = (companyId: string) => ({ ownerId: companyId });
export const receivablesPartyMatch = setupPartyMatch;
export const payablesPartyMatch = setupPartyMatch;
export const activityCompanyMatch = setupPartyMatch;
export const activityPaymentMatch = (companyId: string) => ({
  $and: [companyFilter(companyId), { direction: { $in: ["received", "paid"] } }],
});
export const pipelineCompanyMatch = (companyId: string) => ({
  $and: [companyFilter(companyId), notCancelledMatch()],
});
export const lhcCompanyMatch = (companyId: string) => ({ $and: [companyFilter(companyId), {}] });

export function bookingPeriodMatch(companyId: string, range: DashboardRange) {
  return {
    $and: [
      companyFilter(companyId),
      { createdAt: { $gte: range.previousFrom, $lt: range.to }, ...notCancelledMatch() },
    ],
  };
}

export function billPeriodMatch(companyId: string, range: DashboardRange) {
  return financialsBillMatch(companyId, range);
}

export function paymentPeriodMatch(companyId: string, range: DashboardRange, direction: "received" | "paid") {
  return {
    $and: [
      companyFilter(companyId),
      {
        partyType: direction === "received" ? "customer" : "supplier",
        direction,
        date: { $gte: range.previousFrom, $lt: range.to },
      },
    ],
  };
}

export function trendCompanyMatch(companyId: string, from: Date, to: Date, field: string) {
  return { $and: [companyFilter(companyId), { [field]: { $gte: from, $lt: to } }] };
}

export function financialsBillMatch(companyId: string, range: DashboardRange) {
  return {
    $and: [
      companyFilter(companyId),
      {
        status: { $ne: "Cancelled" },
        $or: [
          { billDate: { $gte: range.from, $lt: range.to } },
          { billDate: { $gte: range.previousFrom, $lt: range.previousTo } },
        ],
      },
    ],
  };
}

export function financialsHireMatch(companyId: string, range: DashboardRange) {
  return {
    $and: [
      companyFilter(companyId),
      {
        status: { $ne: "Cancelled" },
        $or: [
          { lhcDate: { $gte: range.from, $lt: range.to } },
          { lhcDate: { $gte: range.previousFrom, $lt: range.previousTo } },
        ],
      },
    ],
  };
}

export function liveHirePaymentMatch(companyId: string, range: DashboardRange) {
  return {
    $and: [
      companyFilter(companyId),
      { ...notCancelledMatch(), "payments.date": { $gte: range.previousFrom, $lt: range.to } },
    ],
  };
}
