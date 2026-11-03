import { companyFilter } from "@/lib/company-filter";
import type { DashboardRange } from "@/lib/dashboard/shared";
import { notCancelledMatch } from "@/lib/dashboard/status";

export const setupPartyMatch = (companyId: string) => ({ $and: [companyFilter(companyId), {}] });
export const actionSettingsMatch = (companyId: string) => ({ ownerId: companyId });
export const receivablesPartyMatch = setupPartyMatch;
export const payablesPartyMatch = setupPartyMatch;
export const pipelineCompanyMatch = (companyId: string) => ({
  $and: [companyFilter(companyId), notCancelledMatch()],
});

export function bookingPeriodMatch(companyId: string, range: DashboardRange) {
  return {
    $and: [
      companyFilter(companyId),
      { createdAt: { $gte: range.previousFrom, $lt: range.to }, ...notCancelledMatch() },
    ],
  };
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
