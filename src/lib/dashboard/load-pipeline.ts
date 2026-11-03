import dbConnect from "@/lib/db";
import { collectionExists, scopedMatch } from "@/lib/dashboard/shared";
import { pipelineCompanyMatch } from "@/lib/dashboard/loader-scopes";
import { istDaysBetween, startOfIstDay } from "@/lib/dashboard/periods";
import type {
  ActiveTrips,
  ExpiringDocuments,
  OperationsFacts,
} from "@/lib/dashboard/types";
import { POD_CLEARED_STATUSES } from "@/lib/pod-status";
import ConsignmentModel from "@/models/Consignment";
import DriverModel from "@/models/Driver";
import FreightBillModel from "@/models/Bill";
import LorryHireModel from "@/models/LorryHire";
import VehicleModel from "@/models/Vehicle";
import type { PipelineStage } from "mongoose";

interface PipelineAggregation {
  pendingPod: { count: number; oldestAt?: Date }[];
  readyToBill: { count: number; estimatedFreight: number }[];
  overdue: { count: number }[];
  trips: Record<string, unknown>[];
}

interface ExpiryRow {
  date: Date;
}

const emptyDocumentUrl = { $in: [null, ""] };
const DAY_MS = 86_400_000;

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
  const deliveredAt = { $ifNull: ["$deliveredAt", { $ifNull: ["$updatedAt", "$createdAt"] }] };
  return [
    { $match: { status: { $ne: "Cancelled" } } },
    {
      $facet: {
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
              expectedDeliveryDate: "$vehicle.expectedDeliveryDate",
              overdue: { $lt: ["$vehicle.expectedDeliveryDate", now] },
            },
          },
        ],
      },
    },
  ] satisfies PipelineStage[];
}

function expiryWindow(now: Date) {
  const from = startOfIstDay(now);
  return { today: from, through: new Date(from.getTime() + 31 * DAY_MS) };
}

function asExpiryDocuments(
  vehicleRows: ExpiryRow[],
  driverRows: ExpiryRow[],
  now: Date
): ExpiringDocuments {
  const { today, through } = expiryWindow(now);
  const all = [...vehicleRows, ...driverRows].filter(
    (row) => row.date instanceof Date && !Number.isNaN(row.date.getTime()) && row.date < through
  );
  const expired = all.filter((row) => row.date < today).length;
  return { expired, expiringSoon: all.length - expired };
}

async function loadVehicleExpiries(companyId: string, collection: boolean, through: Date): Promise<ExpiryRow[]> {
  if (collection) {
    return VehicleModel.aggregate<ExpiryRow>([
      { $match: scopedMatch(companyId) },
      {
        $project: {
          docs: {
            $concatArrays: [
              {
                $map: {
                  input: { $objectToArray: { $ifNull: ["$documents", {}] } },
                  as: "entry",
                  in: "$$entry.v.expiresOn",
                },
              },
              {
                $map: {
                  input: { $ifNull: ["$otherDocuments", []] },
                  as: "entry",
                  in: "$$entry.expiresOn",
                },
              },
            ],
          },
        },
      },
      { $unwind: "$docs" },
      { $match: { docs: { $type: "date", $lt: through } } },
      { $project: { _id: 0, date: "$docs" } },
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
    { $group: { _id: "$_vehicleKey", date: { $first: "$insurance.validUpto" } } },
    { $match: { _id: { $ne: "" }, date: { $type: "date", $lt: through } } },
    { $project: { _id: 0, date: 1 } },
  ]);
}

async function loadDriverExpiries(companyId: string, collection: boolean, through: Date): Promise<ExpiryRow[]> {
  if (collection) {
    return DriverModel.aggregate<ExpiryRow>([
      { $match: scopedMatch(companyId, { licenseExpiry: { $type: "date", $lt: through } }) },
      { $project: { _id: 0, date: "$licenseExpiry" } },
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
    { $group: { _id: "$_driverKey", date: { $first: "$driver.licenseExpiry" } } },
    { $match: { date: { $type: "date", $lt: through } } },
    { $project: { _id: 0, date: 1 } },
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
  return asExpiryDocuments(vehicles, drivers, now);
}

export interface PipelineLoad {
  activeTrips: ActiveTrips;
  operations: OperationsFacts;
}

export async function loadPipeline(companyId: string): Promise<PipelineLoad> {
  await dbConnect();
  const now = new Date();
  const [rows, documents] = await Promise.all([
    ConsignmentModel.aggregate<PipelineAggregation>([
      { $match: pipelineCompanyMatch(companyId) },
      ...lrFacets(companyId, now, Boolean(ConsignmentModel.schema.path("podStatus"))),
    ]),
    loadExpiringDocuments(companyId, now),
  ]);
  const row = rows[0];
  if (!row) {
    return {
      activeTrips: { items: [] },
      operations: {
        podPending: { count: 0, oldestDays: null },
        readyToBill: { count: 0, estimatedFreight: 0 },
        onRouteOverdue: 0,
        documents,
      },
    };
  }
  const pending = row.pendingPod[0];
  const ready = row.readyToBill[0];
  const activeTrips: ActiveTrips = {
    items: row.trips.map((trip) => ({
      id: String(trip._id),
      lrNo: String(trip.lrNo ?? ""),
      from: String(trip.from ?? ""),
      to: String(trip.to ?? ""),
      vehicleNumber: String(trip.vehicleNumber ?? ""),
      expectedDeliveryDate: trip.expectedDeliveryDate instanceof Date ? trip.expectedDeliveryDate.toISOString() : null,
      overdue: Boolean(trip.overdue),
    })),
  };
  return {
    activeTrips,
    operations: {
      podPending: {
        count: pending?.count ?? 0,
        oldestDays: pending?.oldestAt instanceof Date ? istDaysBetween(pending.oldestAt, now) : null,
      },
      readyToBill: {
        count: ready?.count ?? 0,
        estimatedFreight: ready?.estimatedFreight ?? 0,
      },
      onRouteOverdue: row.overdue[0]?.count ?? 0,
      documents,
    },
  };
}
