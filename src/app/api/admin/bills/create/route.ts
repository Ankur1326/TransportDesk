import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { freightBillFormSchema, computeItemTotal, computeBillTotals, computeBillSummary } from "@/lib/bill/validations";

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const parsed = freightBillFormSchema.parse(body);

    // Never trust client-computed totals — recompute from the line items server-side.
    const items = parsed.items.map((item) => ({
      ...item,
      totalCharges: computeItemTotal(item),
    }));
    // totalAmount is the final invoice amount (trip total after discount / GST / TDS / round-off).
    const summary = computeBillSummary(computeBillTotals(parsed.items).totalCharges, parsed.adjustments);
    const totalAmount = summary.invoiceAmount;
    const payableAmount = summary.payable;

    const created = await FreightBillModel.create({
      ...parsed,
      items,
      totalAmount,
      payableAmount,
    });

    return NextResponse.json(
      { success: true, message: "Bill created successfully", data: created },
      { status: 201 }
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

    console.log("Error while creating bill: ", error);
    return NextResponse.json({ success: false, message: "Error creating bill" }, { status: 500 });
  }
}