import dbConnect from "@/lib/db";
import { collectionExists, scopedMatch, type DashboardRange } from "@/lib/dashboard/shared";
import { lhcCompanyMatch, pipelineCompanyMatch } from "@/lib/dashboard/loader-scopes";
import { legacyLrStatusExpression } from "@/lib/dashboard/status";
import { istDaysBetween, startOfIstDay } from "@/lib/dashboard/periods";
import type {
  ActiveTrips,
  ExpiringDocuments,
  LhcStrip,
  OperationsFacts,
  Pipeline,
} from "@/lib/dashboard/types";
import { POD_CLEARED_STATUSES } from "@/lib/pod-status";
import ConsignmentModel from "@/models/Consignment";
import DriverModel from "@/models/Driver";
import FreightBillModel from "@/models/Bill";
import LorryHireModel from "@/models/LorryHire";
import VehicleModel from "@/models/Vehicle";
import type { PipelineStage } from "mongoose";

interface PipelineAggregation {
  statuses: { _id: string; count: number }[];
  delivered30d: { count: number }[];
  pendingPod: { count: number; oldestAt?: Date }[];
  readyToBill: { count: number; estimatedFreight: number }[];
  overdue: { count: number }[];
  eway: { count: number; expired: number }[];
  trips: Record<string, unknown>[];
}

interface LhcAggregation {
  _id: string;
  count: number;
  balanceDue: number;
  deliveredWithBalance: number;
}

interface ExpiryRow {
  subject: string;
  date: Date;
  kind?: string;
}

const EMPTY: Pipeline = { booked: 0, onRoute: 0, delivered30d: 0, pendingPod: 0, readyToBill: 0 };
const DAY_MS = 86_400_000;

const emptyDocumentUrl = { $in: [null, ""] };

function podPendingMatch(hasPodStatus: boolean) {
  return {
    status: "Delivered",
    ...(hasPodStatus
      ? {
          $or: [
            { podStatus: "Pending" },
            { podStatus: { $exists: false }, podUrl: emptyDocumentUrl },
            { podStatus: null, podUrl: emptyDocumentUrl },
          ],
        }
      : { podUrl: emptyDocumentUrl }),
  };
}

function podClearedMatch(hasPodStatus: boolean) {
  return {
    status: "Delivered",
    ...(hasPodStatus
      ? {
          $or: [
            { podStatus: { $in: [...POD_CLEARED_STATUSES] } },
            { podStatus: { $exists: false }, podUrl: { $nin: [null, ""] } },
            { podStatus: null, podUrl: { $nin: [null, ""] } },
          ],
        }
      : { podUrl: { $nin: [null, ""] } }),
  };
}

function billLookup(companyId: string) {
  return {
    $lookup: {
      from: FreightBillModel.collection.name,
      let: { lrId: "$_id" },
      pipeline: [
        {
          $match: {
            $and: [
              scopedMatch(companyId),
              { $expr: { $in: ["$$lrId", { $ifNull: ["$items.consignmentId", []] }] } },
            ],
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ],
      as: "_dashboardBills",
    },
  };
}

function lrFacets(companyId: string, now: Date, hasPodStatus: boolean): PipelineStage[] {
  const start30d = startOfIstDay(now).getTime() - 29 * DAY_MS;
  const deliveredAt = { $ifNull: ["$deliveredAt", { $ifNull: ["$updatedAt", "$createdAt"] }] };
  return [
    { $match: { status: { $ne: "Cancelled" } } },
    {
      $facet: {
        statuses: [
          { $group: { _id: legacyLrStatusExpression(), count: { $sum: 1 } } },
        ],
        delivered30d: [
          { $match: { status: "Delivered", $expr: { $gte: [deliveredAt, new Date(start30d)] } } },
          { $count: "count" },
        ],
        pendingPod: [
          { $match: podPendingMatch(hasPodStatus) },
          { $set: { _dashboardDeliveredAt: deliveredAt } },
          { $group: { _id: null, count: { $sum: 1 }, oldestAt: { $min: "$_dashboardDeliveredAt" } } },
        ],
        readyToBill: [
          { $match: podClearedMatch(hasPodStatus) },
          billLookup(companyId),
          { $match: { _dashboardBills: { $size: 0 } } },
          { $group: { _id: null, count: { $sum: 1 }, estimatedFreight: { $sum: { $ifNull: ["$charges.freight", 0] } } } },
        ],
        overdue: [
          { $match: { status: "On Route", "vehicle.expectedDeliveryDate": { $lt: now } } },
          { $count: "count" },
        ],
        eway: [
          {
            $match: {
              status: { $nin: ["Delivered", "Cancelled"] },
              validUpTo: { $gte: new Date(now.getTime() - DAY_MS), $lt: new Date(now.getTime() + DAY_MS) },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              expired: { $sum: { $cond: [{ $lt: ["$validUpTo", now] }, 1, 0] } },
            },
          },
        ],
        trips: [
          { $match: { status: "On Route" } },
          { $sort: { "vehicle.expectedDeliveryDate": 1, createdAt: 1 } },
          { $limit: 8 },
          {
            $project: {
              _id: 1,
              lrNo: "$consignmentNumber",
              from: "$from.location",
              to: "$to.location",
              vehicleNumber: 1,
              consignor: "$consignor.name",
              consignee: "$consignee.name",
              expectedDeliveryDate: "$vehicle.expectedDeliveryDate",
              overdue: { $lt: ["$vehicle.expectedDeliveryDate", now] },
            },
          },
        ],
      },
    },
  ] satisfies PipelineStage[];
}

async function loadLhc(companyId: string): Promise<LhcStrip> {
  const rows = await LorryHireModel.aggregate<LhcAggregation>([
    { $match: lhcCompanyMatch(companyId) },
    {
      $group: {
        _id: { $ifNull: ["$status", "Hired"] },
        count: { $sum: 1 },
        balanceDue: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "Delivered"] }, { $ne: ["$status", "Cancelled"] }] }, { $ifNull: ["$settlement.balance", 0] }, 0] } },
        deliveredWithBalance: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "Delivered"] }, { $gt: ["$settlement.balance", 0] }] }, 1, 0] } },
      },
    },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row]));
  return {
    hired: counts.get("Hired")?.count ?? 0,
    inTransit: counts.get("In Transit")?.count ?? 0,
    delivered: counts.get("Delivered")?.count ?? 0,
    cancelled: counts.get("Cancelled")?.count ?? 0,
    balanceDueOnDelivered: rows.reduce((sum, row) => sum + (row.balanceDue ?? 0), 0),
    deliveredWithBalance: rows.reduce((sum, row) => sum + (row.deliveredWithBalance ?? 0), 0),
  };
}

function expiryWindow(now: Date) {
  const from = startOfIstDay(now);
  return { today: from, through: new Date(from.getTime() + 31 * DAY_MS) };
}

function asExpiryDocuments(
  vehicleRows: ExpiryRow[],
  driverRows: ExpiryRow[],
  hasVehicleMaster: boolean,
  hasDriverMaster: boolean,
  now: Date
): ExpiringDocuments {
  const { today, through } = expiryWindow(now);
  const vehicleDocumentNames: Record<string, string> = {
    insurance: "Insurance",
    fitness: "Fitness",
    permit: "Permit",
    puc: "PUC",
    roadTax: "Road tax",
    nationalPermit: "National permit",
  };
  const all = [
    ...vehicleRows.map((row) => ({
      kind: vehicleDocumentNames[row.kind ?? "insurance"] ?? row.kind ?? "Insurance",
      subject: row.subject,
      date: row.date,
    })),
    ...driverRows.map((row) => ({ kind: row.kind ?? "Driver licence", subject: row.subject, date: row.date })),
  ]
    .filter((row) => row.date instanceof Date && !Number.isNaN(row.date.getTime()) && row.date < through)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const expired = all.filter((row) => row.date < today).length;
  const expiringSoon = all.length - expired;
  let source: ExpiringDocuments["source"];
  if (hasVehicleMaster && hasDriverMaster) source = "vehicle-driver-master";
  else if (!hasVehicleMaster && !hasDriverMaster) source = "lorry-hire-contracts";
  else source = "mixed";
  return {
    source,
    expired,
    expiringSoon,
    items: all.slice(0, 10).map((row) => ({
      kind: row.kind,
      subject: row.subject,
      date: row.date.toISOString(),
      expired: row.date < today,
    })),
    unavailable: [],
  };
}

async function loadVehicleExpiries(companyId: string, collection: boolean, through: Date): Promise<ExpiryRow[]> {
  if (collection) {
    return VehicleModel.aggregate<ExpiryRow>([
      { $match: scopedMatch(companyId) },
      {
        $project: {
          subject: "$registrationNumber",
          docs: {
            $concatArrays: [
              {
                $map: {
                  input: { $objectToArray: { $ifNull: ["$documents", {}] } },
                  as: "entry",
                  in: { kind: "$$entry.k", date: "$$entry.v.expiresOn" },
                },
              },
              {
                $map: {
                  input: { $ifNull: ["$otherDocuments", []] },
                  as: "entry",
                  in: { kind: "$$entry.name", date: "$$entry.expiresOn" },
                },
              },
            ],
          },
        },
      },
      { $unwind: "$docs" },
      { $match: { "docs.date": { $type: "date", $lt: through } } },
      { $project: { _id: 0, subject: 1, date: "$docs.date", kind: "$docs.kind" } },
    ]);
  }
  return LorryHireModel.aggregate<ExpiryRow>([
    { $match: scopedMatch(companyId, { status: { $ne: "Cancelled" }, "truck.vehicleNumber": { $nin: ["", null] } }) },
    {
      $set: {
        _vehicleKey: {
          $toUpper: { $regexReplace: { input: "$truck.vehicleNumber", regex: "[^A-Za-z0-9]", replacement: "" } },
        },
      },
    },
    { $sort: { lhcDate: -1, createdAt: -1 } },
    { $group: { _id: "$_vehicleKey", subject: { $first: "$truck.vehicleNumber" }, date: { $first: "$insurance.validUpto" } } },
    { $match: { _id: { $ne: "" }, date: { $type: "date", $lt: through } } },
    { $project: { _id: 0, subject: 1, date: 1 } },
  ]);
}

async function loadDriverExpiries(companyId: string, collection: boolean, through: Date): Promise<ExpiryRow[]> {
  if (collection) {
    return DriverModel.aggregate<ExpiryRow>([
      { $match: scopedMatch(companyId, { licenseExpiry: { $type: "date", $lt: through } }) },
      { $project: { _id: 0, subject: "$name", date: "$licenseExpiry", kind: { $literal: "Driver licence" } } },
    ]);
  }
  return LorryHireModel.aggregate<ExpiryRow>([
    { $match: scopedMatch(companyId, { status: { $ne: "Cancelled" }, "driver.mobile": { $nin: ["", null] } }) },
    {
      $set: {
        _driverDigits: { $regexReplace: { input: "$driver.mobile", regex: "[^0-9]", replacement: "" } },
      },
    },
    {
      $set: {
        _driverKey: {
          $substrCP: [
            "$_driverDigits",
            { $max: [0, { $subtract: [{ $strLenCP: "$_driverDigits" }, 10] }] },
            10,
          ],
        },
      },
    },
    { $match: { $expr: { $gte: [{ $strLenCP: "$_driverDigits" }, 10] } } },
    { $sort: { lhcDate: -1, createdAt: -1 } },
    { $group: { _id: "$_driverKey", subject: { $first: "$driver.name" }, date: { $first: "$driver.licenseExpiry" } } },
    { $match: { date: { $type: "date", $lt: through } } },
    { $project: { _id: 0, subject: 1, date: 1 } },
  ]);
}

export async function loadExpiringDocuments(companyId: string, now: Date = new Date()) {
  const { through } = expiryWindow(now);
  const [vehicleCollection, driverCollection] = await Promise.all([
    collectionExists(VehicleModel.collection.name),
    collectionExists(DriverModel.collection.name),
  ]);
  const [vehicles, drivers] = await Promise.all([
    loadVehicleExpiries(companyId, vehicleCollection, through),
    loadDriverExpiries(companyId, driverCollection, through),
  ]);
  return asExpiryDocuments(vehicles, drivers, vehicleCollection, driverCollection, now);
}

export interface PipelineLoad {
  pipeline: Pipeline;
  activeTrips: ActiveTrips;
  lhc: LhcStrip;
  operations: OperationsFacts;
}

export async function loadPipeline(companyId: string, _range: DashboardRange): Promise<PipelineLoad> {
  void _range;
  await dbConnect();
  const now = new Date();
  const [rows, lhc, documents] = await Promise.all([
    ConsignmentModel.aggregate<PipelineAggregation>([
      { $match: pipelineCompanyMatch(companyId) },
      ...lrFacets(companyId, now, Boolean(ConsignmentModel.schema.path("podStatus"))),
    ]),
    loadLhc(companyId),
    loadExpiringDocuments(companyId, now),
  ]);
  const row = rows[0];
  if (!row) {
    return {
      pipeline: EMPTY,
      activeTrips: { total: 0, items: [] },
      lhc,
      operations: {
        pipeline: EMPTY,
        podPending: { count: 0, oldestDays: null },
        readyToBill: { count: 0, estimatedFreight: 0 },
        onRouteOverdue: 0,
        eway: { count: 0, expired: 0 },
        documents,
      },
    };
  }
  const statusCounts = new Map(row.statuses.map((status) => [status._id, status.count]));
  const delivered30d = row.delivered30d[0]?.count ?? 0;
  const pending = row.pendingPod[0];
  const ready = row.readyToBill[0];
  const pipeline: Pipeline = {
    booked: statusCounts.get("Booked") ?? 0,
    onRoute: statusCounts.get("On Route") ?? 0,
    delivered30d,
    pendingPod: pending?.count ?? 0,
    readyToBill: ready?.count ?? 0,
  };
  const activeTrips: ActiveTrips = {
    total: pipeline.onRoute,
    items: row.trips.map((trip) => ({
      id: String(trip._id),
      lrNo: String(trip.lrNo ?? ""),
      from: String(trip.from ?? ""),
      to: String(trip.to ?? ""),
      vehicleNumber: String(trip.vehicleNumber ?? ""),
      consignor: String(trip.consignor ?? ""),
      consignee: String(trip.consignee ?? ""),
      expectedDeliveryDate: trip.expectedDeliveryDate instanceof Date ? trip.expectedDeliveryDate.toISOString() : null,
      overdue: Boolean(trip.overdue),
    })),
  };
  return {
    pipeline,
    activeTrips,
    lhc,
    operations: {
      pipeline,
      podPending: {
        count: pending?.count ?? 0,
        oldestDays: pending?.oldestAt instanceof Date ? istDaysBetween(pending.oldestAt, now) : null,
      },
      readyToBill: {
        count: ready?.count ?? 0,
        estimatedFreight: ready?.estimatedFreight ?? 0,
      },
      onRouteOverdue: row.overdue[0]?.count ?? 0,
      eway: { count: row.eway[0]?.count ?? 0, expired: row.eway[0]?.expired ?? 0 },
      documents,
    },
  };
}
