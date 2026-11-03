import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { vehicleSchema } from "@/lib/fleet-validation";
import VehicleModel from "@/models/Vehicle";
import DriverModel from "@/models/Driver";
import SupplierModel from "@/models/Supplier";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  try {
    await dbConnect();
    const vehicles = await VehicleModel.find(companyFilter(auth.companyId)).sort({ registrationNumber: 1 }).lean();
    return NextResponse.json({ success: true, data: vehicles });
  } catch (error) {
    console.error("Fleet vehicles list failed:", error);
    return NextResponse.json({ success: false, message: "Unable to load vehicles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  try {
    const parsed = vehicleSchema.parse(await request.json());
    await dbConnect();
    if (parsed.ownerSupplierId && !mongoose.isValidObjectId(parsed.ownerSupplierId)) {
      return NextResponse.json({ success: false, message: "Select a valid owner supplier." }, { status: 400 });
    }
    if (parsed.ownerSupplierId && !(await SupplierModel.exists({ _id: parsed.ownerSupplierId, ...companyFilter(auth.companyId) }))) {
      return NextResponse.json({ success: false, message: "Owner supplier not found." }, { status: 400 });
    }
    if (parsed.defaultDriverId && !(await DriverModel.exists({ _id: parsed.defaultDriverId, ...companyFilter(auth.companyId) }))) {
      return NextResponse.json({ success: false, message: "Default driver not found." }, { status: 400 });
    }
    if (
      Object.values(parsed.documents).some((document) => document?.fileUrl || document?.filePublicId) ||
      parsed.otherDocuments.some((document) => document.fileUrl || document.filePublicId || document._id)
    ) {
      return NextResponse.json({ success: false, message: "Upload documents after creating the vehicle." }, { status: 400 });
    }
    const { ownerSupplierId, defaultDriverId, ...values } = parsed;
    const vehicle = await VehicleModel.create({
      ...values,
      ...(ownerSupplierId ? { ownerSupplierId } : {}),
      ...(defaultDriverId ? { defaultDriverId } : {}),
      companyId: auth.companyId,
    });
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid vehicle details." }, { status: 400 });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ success: false, message: "A vehicle with this registration number already exists." }, { status: 409 });
    }
    console.error("Fleet vehicle create failed:", error);
    return NextResponse.json({ success: false, message: "Unable to save vehicle." }, { status: 500 });
  }
}
