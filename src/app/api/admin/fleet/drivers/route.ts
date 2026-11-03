import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { driverSchema } from "@/lib/fleet-validation";
import DriverModel from "@/models/Driver";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  try {
    await dbConnect();
    const drivers = await DriverModel.find(companyFilter(auth.companyId)).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: drivers });
  } catch (error) {
    console.error("Fleet drivers list failed:", error);
    return NextResponse.json({ success: false, message: "Unable to load drivers." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  try {
    const parsed = driverSchema.parse(await request.json());
    await dbConnect();
    const driver = await DriverModel.create({ ...parsed, companyId: auth.companyId });
    return NextResponse.json({ success: true, data: driver }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid driver details." }, { status: 400 });
    }
    console.error("Fleet driver create failed:", error);
    return NextResponse.json({ success: false, message: "Unable to save driver." }, { status: 500 });
  }
}
