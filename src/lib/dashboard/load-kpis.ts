import dbConnect from "@/lib/db";
import { rangeTotalsPipeline, scopedMatch, rupees, type DashboardRange } from "@/lib/dashboard/shared";
import { bookingPeriodMatch, billPeriodMatch, liveHirePaymentMatch, paymentPeriodMatch } from "@/lib/dashboard/loader-scopes";
import { computeDelta } from "@/lib/dashboard/build-deltas";
import type { KpiValue, Kpis } from "@/lib/dashboard/types";
import { buildTripProfit } from "@/lib/lorry-hire/fleet-reports";
import { loadLrFreight, loadReportContracts } from "@/lib/lorry-hire/load-fleet-reports";
import FreightBillModel from "@/models/Bill";
import ConsignmentModel from "@/models/Consignment";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";
import mongoose from "mongoose";
import { sumUnmirroredHirePayments, type HirePaymentForTotals } from "@/lib/dashboard/money";

type Totals = { current?: number; previous?: number };

async function billTotals(companyId: string, range: DashboardRange): Promise<Totals> {
  const [row] = await FreightBillModel.aggregate<Totals>([
    { $match: billPeriodMatch(companyId, range) },
    ...rangeTotalsPipeline("billDate", { $ifNull: ["$payableAmount", "$totalAmount"] }, range).slice(1),
  ]);
  return row ?? { current: 0, previous: 0 };
}

async function paymentTotals(companyId: string, range: DashboardRange, direction: "received" | "paid"): Promise<Totals> {
  const [row] = await PaymentModel.aggregate<Totals>([
    { $match: paymentPeriodMatch(companyId, range, direction) },
    ...rangeTotalsPipeline("date", "$amount", range).slice(1),
  ]);
  return row ?? { current: 0, previous: 0 };
}

async function bookingTotals(companyId: string, range: DashboardRange): Promise<{ current: number; previous: number }> {
  const [row] = await ConsignmentModel.aggregate<{ current: number; previous: number }>([
    { $match: bookingPeriodMatch(companyId, range) },
    {
      $group: {
        _id: null,
        current: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", range.from] }, { $lt: ["$createdAt", range.to] }] }, 1, 0] } },
        previous: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", range.previousFrom] }, { $lt: ["$createdAt", range.previousTo] }] }, 1, 0] } },
      },
    },
  ]);
  return row ?? { current: 0, previous: 0 };
}

interface HirePaymentRow extends HirePaymentForTotals {
  _id?: mongoose.Types.ObjectId;
}

async function hirePaymentTotals(companyId: string, range: DashboardRange) {
  const payments = await LorryHireModel.aggregate<HirePaymentRow>([
    { $match: liveHirePaymentMatch(companyId, range) },
    { $unwind: "$payments" },
    { $match: { "payments.date": { $gte: range.previousFrom, $lt: range.to } } },
    { $project: { amount: "$payments.amount", date: "$payments.date", ledgerPaymentId: "$payments.ledgerPaymentId" } },
  ]);
  const rows = payments;
  const ids = [...new Set(rows.flatMap((p) => p.ledgerPaymentId ? [p.ledgerPaymentId] : []))];
  const mirroredIds = ids.length
    ? new Set((await PaymentModel.distinct("_id", scopedMatch(companyId, {
        _id: { $in: ids },
        partyType: "supplier",
        direction: "paid",
      }))).map(String))
    : new Set<string>();
  return sumUnmirroredHirePayments(rows, mirroredIds, range);
}

function value(current: number, previous: number): KpiValue {
  const currentRupees = rupees(current);
  const previousRupees = rupees(previous);
  return {
    value: currentRupees,
    previous: previousRupees,
    deltaPct: computeDelta(currentRupees, previousRupees).pct,
  };
}

async function tripProfit(companyId: string, from: Date, to: Date) {
  const contracts = await loadReportContracts(companyId, { from, to: new Date(to.getTime() - 1) });
  const freight = await loadLrFreight(companyId, contracts);
  return buildTripProfit(contracts, freight).totals;
}

export async function loadKpis(companyId: string, range: DashboardRange): Promise<Kpis> {
  await dbConnect();
  const [bookings, bills, received, paid, embeddedPaid, currentProfit, previousProfit] = await Promise.all([
    bookingTotals(companyId, range),
    billTotals(companyId, range),
    paymentTotals(companyId, range, "received"),
    paymentTotals(companyId, range, "paid"),
    hirePaymentTotals(companyId, range),
    tripProfit(companyId, range.from, range.to),
    tripProfit(companyId, range.previousFrom, range.previousTo),
  ]);
  const currentPaid = (paid.current ?? 0) + embeddedPaid.current;
  const previousPaid = (paid.previous ?? 0) + embeddedPaid.previous;
  const margin = value(currentProfit.profit, previousProfit.profit);
  return {
    bookings: value(bookings.current, bookings.previous),
    freightBilled: value(bills.current ?? 0, bills.previous ?? 0),
    collected: value(received.current ?? 0, received.previous ?? 0),
    paidToSuppliers: value(currentPaid, previousPaid),
    grossMargin: {
      ...margin,
      revenue: rupees(currentProfit.revenue),
      cost: rupees(currentProfit.cost),
      marginPct: currentProfit.marginPct,
      trips: currentProfit.trips,
      lossTrips: currentProfit.lossTrips,
    },
  };
}
