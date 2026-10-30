import mongoose from "mongoose";
import { z } from "zod";
import { companyFilter } from "@/lib/company-scope";
import ConsignmentModel from "@/models/Consignment";
import LorryHireModel from "@/models/LorryHire";
import type { LrFreight, ReportContract } from "@/lib/lorry-hire/fleet-reports";

/** Safety cap on contracts read per report request (newest first). */
export const REPORT_CONTRACT_CAP = 5000;

const dateParam = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

export const reportQuerySchema = z.object({
  from: dateParam,
  to: dateParam,
  supplierId: z.string().optional(),
  search: z.string().trim().max(100).default(""),
  currentPage: z.coerce.number().int().min(1).default(1),
  itemsPerPage: z.coerce.number().int().min(1).max(200).default(25),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

interface HireLean {
  _id: mongoose.Types.ObjectId;
  lhcNo: string;
  lhcDate: Date;
  status: string;
  supplier?: { name?: string };
  from?: { location?: string };
  to?: { location?: string };
  owner?: { name?: string };
  driver?: { name?: string; mobile?: string; licenseNumber?: string };
  truck?: { vehicleNumber?: string; truckType?: string };
  settlement?: { grossHire?: number };
  items?: { consignmentId?: mongoose.Types.ObjectId; cnNo: string }[];
}

export async function loadReportContracts(
  companyId: string,
  q: Pick<ReportQuery, "from" | "to" | "supplierId">
): Promise<ReportContract[]> {
  const filters: Record<string, unknown>[] = [companyFilter(companyId), { status: { $ne: "Cancelled" } }];
  if (q.supplierId && mongoose.isValidObjectId(q.supplierId)) {
    filters.push({ "supplier.supplierId": new mongoose.Types.ObjectId(q.supplierId) });
  }
  if (q.from || q.to) {
    filters.push({
      lhcDate: { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) },
    });
  }

  const hires = (await LorryHireModel.find({ $and: filters })
    .select(
      "lhcNo lhcDate status supplier.name from.location to.location owner.name driver truck.vehicleNumber truck.truckType settlement.grossHire items.consignmentId items.cnNo"
    )
    .sort({ lhcDate: -1 })
    .limit(REPORT_CONTRACT_CAP)
    .lean()) as unknown as HireLean[];

  return hires.map((h) => ({
    _id: String(h._id),
    lhcNo: h.lhcNo,
    lhcDate: h.lhcDate.toISOString(),
    status: h.status,
    supplierName: h.supplier?.name ?? "",
    fromLocation: h.from?.location ?? "",
    toLocation: h.to?.location ?? "",
    vehicleNumber: h.truck?.vehicleNumber ?? "",
    truckType: h.truck?.truckType,
    ownerName: h.owner?.name,
    driverName: h.driver?.name,
    driverMobile: h.driver?.mobile,
    licenseNumber: h.driver?.licenseNumber,
    grossHire: h.settlement?.grossHire ?? 0,
    items: (h.items ?? []).map((i) => ({
      consignmentId: i.consignmentId ? String(i.consignmentId) : undefined,
      cnNo: i.cnNo,
    })),
  }));
}

/** LR freight for every consignment referenced by the contracts (company-scoped). */
export async function loadLrFreight(
  companyId: string,
  contracts: ReportContract[]
): Promise<Map<string, LrFreight>> {
  const ids = [
    ...new Set(contracts.flatMap((c) => c.items.map((i) => i.consignmentId)).filter((v): v is string => !!v)),
  ].filter((id) => mongoose.isValidObjectId(id));
  const map = new Map<string, LrFreight>();
  if (ids.length === 0) return map;

  const lrs = (await ConsignmentModel.find({
    $and: [companyFilter(companyId), { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }],
  })
    .select("charges.freight status")
    .lean()) as unknown as { _id: mongoose.Types.ObjectId; charges?: { freight?: number }; status?: string }[];

  for (const lr of lrs) {
    // Legacy LRs have no status and count as Booked.
    map.set(String(lr._id), { freight: lr.charges?.freight ?? 0, status: lr.status ?? "Booked" });
  }
  return map;
}

export const paginate = <T,>(rows: T[], page: number, per: number) => ({
  rows: rows.slice((page - 1) * per, page * per),
  totalItems: rows.length,
  totalPages: Math.max(1, Math.ceil(rows.length / per)),
});
