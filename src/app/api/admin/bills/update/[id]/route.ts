import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { freightBillFormSchema, computeItemTotal, computeBillTotals, computeBillSummary } from "@/lib/bill/validations"

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ [key: string]: string | string[] }> }
) {
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
    const body = await request.json();
    const parsed = freightBillFormSchema.parse(body);

    const items = parsed.items.map((item) => ({ ...item, totalCharges: computeItemTotal(item) }));
    // totalAmount is the final invoice amount (trip total after discount / GST / TDS / round-off).
    const summary = computeBillSummary(computeBillTotals(parsed.items).totalCharges, parsed.adjustments);
    const totalAmount = summary.invoiceAmount;
    const payableAmount = summary.payable;

    const updated = await FreightBillModel.findByIdAndUpdate(
      id,
      { ...parsed, items, totalAmount, payableAmount },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Bill updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error.flatten() },
        { status: 400 }
      );
    }

    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "That bill number already exists — refresh and try again." },
        { status: 409 }
      );
    }

    console.log("Error while updating bill: ", error);
    return NextResponse.json({ success: false, message: "Error updating bill" }, { status: 500 });
  }
}