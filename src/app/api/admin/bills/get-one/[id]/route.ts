import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { requireCompany, companyFilter } from "@/lib/company-scope";

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ [key: string]: string | string[] }> }
) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();
  const resolvedParams = await params;
  const id =
    typeof resolvedParams.id === "string"
      ? resolvedParams.id
      : Array.isArray(resolvedParams.id)
      ? resolvedParams.id[0]
      : "";

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, message: "Invalid bill id" }, { status: 400 });
  }

  try {
    const bill = await FreightBillModel.findOne({ _id: id, ...companyFilter(auth.companyId) }).lean();

    if (!bill) {
      return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Bill fetched successfully", data: bill },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while fetching bill: ", error);
    return NextResponse.json({ success: false, message: "Error fetching bill" }, { status: 500 });
  }
}