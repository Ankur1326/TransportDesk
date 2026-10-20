import { NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";

/**
 * GET /api/consignments/next-number
 *
 * Looks at every consignment already saved, finds the highest purely-numeric
 * consignment number, and returns one more than that. If nothing exists yet
 * (or nothing meets the starting number), returns 2051.
 *
 * This is the single source of truth for numbering — every "new consignment"
 * screen should ask this endpoint rather than guessing locally, so numbers
 * stay sequential across users/devices/browsers.
 */
export async function GET() {
  try {
    const auth = await requireCompany();
    if (!auth.ok) return auth.response;
    const companyId = auth.companyId;

    await dbConnect();
    const companySettings = await CompanySettings.findOne({ ownerId: companyId })
      .select("consignmentStartNumber")
      .lean();
    const startNumber = companySettings?.consignmentStartNumber ?? 2051;

    const result = await ConsignmentModel.aggregate<{ maxNumber: number | null }>([
      // Only consider consignment numbers that are plain digits — anything
      // hand-edited into a non-numeric format is ignored for sequencing.
      { $match: { consignmentNumber: { $regex: /^\d+$/ }, ...companyFilter(companyId) } },
      { $project: { numericValue: { $toLong: "$consignmentNumber" } } },
      { $group: { _id: null, maxNumber: { $max: "$numericValue" } } },
    ]);

    const highest = result[0]?.maxNumber ?? null;
    const nextNumber = Math.max(startNumber, highest !== null ? highest + 1 : startNumber);

    return NextResponse.json(
      {
        success: true,
        message: "Next consignment number fetched successfully",
        data: { nextNumber: String(nextNumber) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while computing next consignment number: ", error);
    return NextResponse.json(
      { success: false, message: "Error fetching next consignment number" },
      { status: 500 }
    );
  }
}