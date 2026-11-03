import dbConnect from "@/lib/db";
import { buildCollectionSeries, buildRevenueSeries, type KeyedAmount } from "@/lib/dashboard/build-trends";
import { collectionBuckets, DASHBOARD_TIMEZONE, revenueBuckets, type ResolvedPeriod } from "@/lib/dashboard/periods";
import { rupees, scopedMatch } from "@/lib/dashboard/shared";
import { trendCompanyMatch } from "@/lib/dashboard/loader-scopes";
import type { TopCustomer, TopRoute, Trends } from "@/lib/dashboard/types";
import FreightBillModel from "@/models/Bill";
import ConsignmentModel from "@/models/Consignment";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";

interface KeyedRow {
  _id: string;
  amount: number;
}

interface CustomerRow {
  _id: { key: string; id?: unknown };
  name: string;
  amount: number;
}

interface RouteRow {
  _id: { from: string; to: string };
  count: number;
}

function monthGroup(field: string) {
  return { $dateToString: { format: "%Y-%m", date: `$${field}`, timezone: DASHBOARD_TIMEZONE } };
}

function dayGroup(field: string) {
  return { $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: DASHBOARD_TIMEZONE } };
}

export async function loadTrends(companyId: string, period: ResolvedPeriod): Promise<Trends> {
  await dbConnect();
  const now = new Date();
  const months = revenueBuckets(period, now);
  const collections = collectionBuckets(period);
  const monthFrom = months[0]?.from ?? period.from;
  const monthTo = months.at(-1)?.to ?? period.to;
  const [billed, hireCost, customers, routes, payments] = await Promise.all([
    FreightBillModel.aggregate<KeyedRow>([
      { $match: trendCompanyMatch(companyId, monthFrom, monthTo, "billDate") },
      { $group: { _id: monthGroup("billDate"), amount: { $sum: { $ifNull: ["$payableAmount", "$totalAmount"] } } } },
    ]),
    LorryHireModel.aggregate<KeyedRow>([
      { $match: scopedMatch(companyId, { status: { $ne: "Cancelled" }, lhcDate: { $gte: monthFrom, $lt: monthTo } }) },
      { $group: { _id: monthGroup("lhcDate"), amount: { $sum: { $ifNull: ["$settlement.grossHire", 0] } } } },
    ]),
    FreightBillModel.aggregate<CustomerRow>([
      { $match: trendCompanyMatch(companyId, period.from, period.to, "billDate") },
      {
        $group: {
          _id: {
            key: { $ifNull: [{ $toString: "$customerId" }, { $toLower: { $trim: { input: { $ifNull: ["$billedTo.name", ""] } } } }] },
            id: "$customerId",
          },
          name: { $first: "$billedTo.name" },
          amount: { $sum: { $ifNull: ["$payableAmount", "$totalAmount"] } },
        },
      },
      { $sort: { amount: -1, name: 1 } },
      { $limit: 5 },
    ]),
    ConsignmentModel.aggregate<RouteRow>([
      {
        $match: scopedMatch(companyId, {
          status: { $ne: "Cancelled" },
          createdAt: { $gte: period.from, $lt: period.to },
        }),
      },
      {
        $group: {
          _id: { from: { $ifNull: ["$from.location", ""] }, to: { $ifNull: ["$to.location", ""] } },
          count: { $sum: 1 },
        },
      },
      { $match: { "_id.from": { $ne: "" }, "_id.to": { $ne: "" } } },
      { $sort: { count: -1, "_id.from": 1, "_id.to": 1 } },
      { $limit: 5 },
    ]),
    PaymentModel.aggregate<KeyedRow>([
      {
        $match: scopedMatch(companyId, {
          partyType: "customer",
          direction: "received",
          date: { $gte: period.from, $lt: period.to },
        }),
      },
      { $group: { _id: dayGroup("date"), amount: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const toKeyed = (rows: KeyedRow[]): KeyedAmount[] => rows.map((row) => ({ key: row._id, amount: rupees(row.amount) }));
  const topCustomers: TopCustomer[] = customers.map((row) => ({
    id: row._id.id ? String(row._id.id) : null,
    name: row.name || "Unlinked customer",
    amount: rupees(row.amount),
  }));
  const topRoutes: TopRoute[] | null = routes.length
    ? routes.map((row) => ({ from: row._id.from, to: row._id.to, count: row.count }))
    : null;
  return {
    revenueVsCost: buildRevenueSeries(months, toKeyed(billed), toKeyed(hireCost)),
    topCustomers,
    topRoutes,
    collections: {
      unit: collections.unit,
      points: buildCollectionSeries(collections.buckets, toKeyed(payments)),
    },
  };
}
