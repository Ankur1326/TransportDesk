import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { driverUpdateSchema } from "@/lib/fleet-validation";
import { aggregateDrivers } from "@/lib/lorry-hire/fleet-reports";
import { loadReportContracts } from "@/lib/lorry-hire/load-fleet-reports";
import DriverModel from "@/models/Driver";
import { ZodError } from "zod";

type Context = { params: Promise<{ id: string }> };
const fail = (message: string, status = 400) => NextResponse.json({ success: false, message }, { status });

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid driver id.");

  try {
    await dbConnect();
    const driver = await DriverModel.findOne({ _id: id, ...companyFilter(auth.companyId) }).lean();
    if (!driver) return fail("Driver not found.", 404);
    const contracts = await loadReportContracts(auth.companyId, { from: null, to: null });
    const digits = driver.mobile.replace(/\D/g, "").slice(-10);
    const stats = aggregateDrivers(contracts).find((row) =>
      digits.length === 10 ? row.mobile === digits : row.name.toLowerCase() === driver.name.toLowerCase()
    ) ?? null;
    return NextResponse.json({ success: true, data: { record: driver, stats } });
  } catch (error) {
    console.error("Fleet driver load failed:", error);
    return fail("Unable to load driver.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid driver id.");

  try {
    const parsed = driverUpdateSchema.parse(await request.json());
    await dbConnect();
    const driver = await DriverModel.findOneAndUpdate(
      { _id: id, ...companyFilter(auth.companyId) },
      { $set: parsed },
      { new: true, runValidators: true }
    ).lean();
    if (!driver) return fail("Driver not found.", 404);
    return NextResponse.json({ success: true, data: driver });
  } catch (error) {
    if (error instanceof ZodError) return fail(error.issues[0]?.message ?? "Invalid driver details.");
    console.error("Fleet driver update failed:", error);
    return fail("Unable to update driver.", 500);
  }
}
