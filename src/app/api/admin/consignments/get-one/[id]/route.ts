import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid consignment id" }, { status: 400 });
  }

  await dbConnect();

  try {
    const consignment = await ConsignmentModel.findOne({ _id: id, ...companyFilter(auth.companyId) }).lean();
    if (!consignment) {
      return NextResponse.json({ success: false, message: "Consignment not found" }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, message: "Consignment fetched successfully", data: consignment },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching consignment:", error);
    return NextResponse.json({ success: false, message: "Error fetching consignment" }, { status: 500 });
  }
}
