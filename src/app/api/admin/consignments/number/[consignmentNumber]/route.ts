import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";

/** GET /api/admin/consignments/number/:consignmentNumber */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ consignmentNumber: string }> }
) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { consignmentNumber } = await params;
  await dbConnect();

  try {
    const consignment = await ConsignmentModel.findOne({
      consignmentNumber: decodeURIComponent(consignmentNumber).trim(),
      ...companyFilter(auth.companyId),
    }).lean();

    if (!consignment) {
      return NextResponse.json({ success: false, message: "Consignment not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: consignment }, { status: 200 });
  } catch (error) {
    console.error("Error while fetching consignment by number:", error);
    return NextResponse.json({ success: false, message: "Error fetching consignment" }, { status: 500 });
  }
}
