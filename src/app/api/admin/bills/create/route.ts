import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { requireCompanyProfile } from "@/lib/company-scope";
import { dropLegacyUniqueIndex } from "@/lib/legacy-indexes";
import { allConsignmentsBelongToCompany } from "@/lib/bill/verify-consignments";
import { freightBillFormSchema, computeItemTotal, computeBillTotals, computeBillSummary } from "@/lib/bill/validations";

export async function POST(request: NextRequest) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  await dbConnect();
  await dropLegacyUniqueIndex(FreightBillModel, "billNo");

  try {
    const body = await request.json();
    const parsed = freightBillFormSchema.parse(body);

    if (!(await allConsignmentsBelongToCompany(parsed.items.map((i) => i.consignmentId), auth.companyId))) {
      return NextResponse.json(
        { success: false, message: "One or more consignments were not found." },
        { status: 400 }
      );
    }

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
      // Server-controlled — never taken from the request body.
      companyId: auth.companyId,
      createdBy: auth.userId,
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