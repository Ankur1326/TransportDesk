import { after, NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { billingFormSchema } from "@/lib/validations/billing";
import { syncLegacyChargeFields } from "@/lib/charges";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { ensurePartyCustomers } from "@/lib/ensure-party-customers";
import { warmLrPdf } from "@/lib/lr-pdf-cache";
import { pdfRenderBaseUrl } from "@/lib/pdf-cache";

/**
 * PUT /api/admin/consignments/update/:id
 *
 * Replaces the editable LR fields with a validated BillingFormValues body.
 * Status, POD, ownership and timestamps are NOT editable here (zod strips
 * unknown keys), so they can only change through PATCH / the POD route.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid consignment id" }, { status: 400 });
  }

  await dbConnect();

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
    }

    const parsed = billingFormSchema.parse(body);
    parsed.charges = syncLegacyChargeFields(parsed.charges);

    const scope = { _id: id, ...companyFilter(auth.companyId) };
    const existing = await ConsignmentModel.findOne(scope).select("status").lean();
    if (!existing) {
      return NextResponse.json({ success: false, message: "Consignment not found" }, { status: 404 });
    }
    if (existing.status === "Cancelled") {
      return NextResponse.json({ success: false, message: "A cancelled LR can't be edited." }, { status: 409 });
    }

    // Changing the number must not collide with another LR of this company.
    const clash = await ConsignmentModel.exists({
      _id: { $ne: id },
      consignmentNumber: parsed.consignmentNumber,
      ...companyFilter(auth.companyId),
    });
    if (clash) {
      return NextResponse.json(
        { success: false, message: `A consignment with number ${parsed.consignmentNumber} already exists.` },
        { status: 409 }
      );
    }

    // Parties added while editing a saved bilty also become customers.
    await ensurePartyCustomers(parsed, auth.companyId, auth.userId);

    const consignment = await ConsignmentModel.findOneAndUpdate(
      scope,
      { $set: parsed },
      { new: true, runValidators: true }
    );

    if (!consignment) {
      return NextResponse.json({ success: false, message: "Consignment not found" }, { status: 404 });
    }

    // Build the PDF in the background so the first "open" is already instant.
    const cookieHeader = request.headers.get("cookie") ?? "";
    const baseUrl = pdfRenderBaseUrl(request.nextUrl.origin);
    const lrId = String(consignment._id);
    after(() => warmLrPdf({ id: lrId, companyId: auth.companyId, baseUrl, cookieHeader }));

    return NextResponse.json(
      { success: true, message: "Consignment updated successfully", data: consignment },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: error.flatten() },
        { status: 400 }
      );
    }
    if (typeof error === "object" && error !== null && (error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A consignment with this number already exists." },
        { status: 409 }
      );
    }
    console.error("Error while updating consignment:", error);
    return NextResponse.json({ success: false, message: "Error updating consignment" }, { status: 500 });
  }
}
