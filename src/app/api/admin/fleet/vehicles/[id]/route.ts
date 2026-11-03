import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { vehicleUpdateSchema } from "@/lib/fleet-validation";
import { aggregateVehicles } from "@/lib/lorry-hire/fleet-reports";
import { loadReportContracts } from "@/lib/lorry-hire/load-fleet-reports";
import { normalizeVehicleNumber } from "@/lib/lorry-hire/constants";
import VehicleModel from "@/models/Vehicle";
import DriverModel from "@/models/Driver";
import SupplierModel from "@/models/Supplier";
import { ZodError } from "zod";
import { VEHICLE_DOCUMENT_KEYS } from "@/lib/fleet-types";

type Context = { params: Promise<{ id: string }> };
const fail = (message: string, status = 400) => NextResponse.json({ success: false, message }, { status });

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid vehicle id.");

  try {
    await dbConnect();
    const vehicle = await VehicleModel.findOne({ _id: id, ...companyFilter(auth.companyId) }).lean();
    if (!vehicle) return fail("Vehicle not found.", 404);
    const contracts = await loadReportContracts(auth.companyId, { from: null, to: null });
    const stats = aggregateVehicles(contracts).find(
      (row) => normalizeVehicleNumber(row.vehicleNumber) === normalizeVehicleNumber(vehicle.registrationNumber)
    ) ?? null;
    return NextResponse.json({ success: true, data: { record: vehicle, stats } });
  } catch (error) {
    console.error("Fleet vehicle load failed:", error);
    return fail("Unable to load vehicle.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid vehicle id.");

  try {
    const body = await request.json() as Record<string, unknown>;
    const parsed = vehicleUpdateSchema.parse(body);
    await dbConnect();
    const current = await VehicleModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
      .select("documents otherDocuments")
      .lean();
    if (!current) return fail("Vehicle not found.", 404);
    if (parsed.ownerSupplierId && !(await SupplierModel.exists({ _id: parsed.ownerSupplierId, ...companyFilter(auth.companyId) }))) {
      return fail("Owner supplier not found.");
    }
    if (parsed.defaultDriverId && !(await DriverModel.exists({ _id: parsed.defaultDriverId, ...companyFilter(auth.companyId) }))) {
      return fail("Default driver not found.");
    }
    const { ownerSupplierId, defaultDriverId, ...values } = parsed;
    if (values.documents) {
      for (const key of VEHICLE_DOCUMENT_KEYS) {
        const incoming = values.documents[key];
        if (!incoming) continue;
        const existing = current.documents?.[key];
        if (
          (incoming.fileUrl && incoming.fileUrl !== existing?.fileUrl) ||
          (incoming.filePublicId && incoming.filePublicId !== existing?.filePublicId)
        ) return fail("Document files can only be changed through the upload endpoint.");
        incoming.fileUrl = existing?.fileUrl ?? "";
        incoming.filePublicId = existing?.filePublicId ?? "";
      }
    }
    if (values.otherDocuments) {
      for (const incoming of values.otherDocuments) {
        const existing = incoming._id
          ? current.otherDocuments.find((document) => String(document._id) === incoming._id)
          : undefined;
        if (
          (incoming._id && !existing) ||
          (incoming.fileUrl && incoming.fileUrl !== existing?.fileUrl) ||
          (incoming.filePublicId && incoming.filePublicId !== existing?.filePublicId)
        ) return fail("Other document files can only be changed through the upload endpoint.");
        incoming.fileUrl = existing?.fileUrl ?? "";
        incoming.filePublicId = existing?.filePublicId ?? "";
      }
    }
    const update: { $set: Record<string, unknown>; $unset?: Record<string, ""> } = {
      $set: { ...values },
    };
    const unset: Record<string, ""> = {};
    if (ownerSupplierId) update.$set.ownerSupplierId = ownerSupplierId;
    else if (Object.hasOwn(body, "ownerSupplierId")) unset.ownerSupplierId = "";
    if (defaultDriverId) update.$set.defaultDriverId = defaultDriverId;
    else if (Object.hasOwn(body, "defaultDriverId")) unset.defaultDriverId = "";
    if (Object.keys(unset).length) update.$unset = unset;
    const vehicle = await VehicleModel.findOneAndUpdate(
      { _id: id, ...companyFilter(auth.companyId) },
      update,
      { new: true, runValidators: true }
    ).lean();
    if (!vehicle) return fail("Vehicle not found.", 404);
    return NextResponse.json({ success: true, data: vehicle });
  } catch (error) {
    if (error instanceof ZodError) return fail(error.issues[0]?.message ?? "Invalid vehicle details.");
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return fail("A vehicle with this registration number already exists.", 409);
    }
    console.error("Fleet vehicle update failed:", error);
    return fail("Unable to update vehicle.", 500);
  }
}
