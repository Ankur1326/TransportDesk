import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { billingFormSchema } from "@/lib/validations/billing";
import { syncLegacyChargeFields } from "@/lib/charges";
import { companyFilter, requireCompany } from "@/lib/company-scope";

/**
 * POST /api/admin/consignments/create
 *
 * Body: BillingFormValues (validated with billingFormSchema).
 * Creates a consignment owned by the signed-in company with status "Booked".
 * Fails with 409 if that company already has the same consignment number.
 */
export async function POST(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const body = await request.json();
    const parsed = billingFormSchema.parse(body);
    parsed.charges = syncLegacyChargeFields(parsed.charges);

    const existing = await ConsignmentModel.findOne({
      consignmentNumber: parsed.consignmentNumber,
      ...companyFilter(auth.companyId),
    })
      .select("_id")
      .lean();

    if (existing) {
      return NextResponse.json(
        { success: false, message: `A consignment with number ${parsed.consignmentNumber} already exists.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const consignment = await ConsignmentModel.create({
      ...parsed,
      // Server-controlled fields — never taken from the request body.
      companyId: auth.companyId,
      createdBy: auth.companyId,
      status: "Booked",
      statusHistory: [{ status: "Booked", at: now, by: auth.companyId, note: "" }],
    });

    return NextResponse.json(
      { success: true, message: "Consignment created successfully", data: consignment },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error.flatten() },
        { status: 400 }
      );
    }

    // Unique-index race (companyId + consignmentNumber)
    if (typeof error === "object" && error !== null && (error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A consignment with this number already exists." },
        { status: 409 }
      );
    }

    console.error("Error while creating consignment:", error);
    return NextResponse.json({ success: false, message: "Error creating consignment" }, { status: 500 });
  }
}
