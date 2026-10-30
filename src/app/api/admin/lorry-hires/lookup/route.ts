import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { normalizeVehicleNumber } from "@/lib/lorry-hire/constants";
import { fail } from "@/lib/lorry-hire/server";

/**
 * GET /api/admin/lorry-hires/lookup?vehicle=MH23AU6718
 * The most recent contract for this truck, so the form can offer
 * "use last details" (driver, owner, truck, insurance, supplier, bank).
 * `data` is null when the truck hasn't been hired before.
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const vehicle = normalizeVehicleNumber(new URL(request.url).searchParams.get("vehicle") ?? "");
  if (vehicle.length < 6) return fail("Enter the full vehicle number.", 400);

  try {
    await dbConnect();
    const last = await LorryHireModel.findOne({
      $and: [companyFilter(auth.companyId), { "truck.vehicleNumber": vehicle, status: { $ne: "Cancelled" } }],
    })
      .sort({ lhcDate: -1, createdAt: -1 })
      .select("lhcNo lhcDate driver owner truck insurance supplier bank")
      .lean();

    return NextResponse.json({ success: true, data: last ?? null });
  } catch (error) {
    console.error("Error looking up vehicle:", error);
    return fail("Error looking up vehicle", 500);
  }
}
