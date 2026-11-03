import { after, NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import { atomically, syncLrBilling } from "@/lib/bill/lr-billing-sync";
import { dropLegacyUniqueIndex } from "@/lib/legacy-indexes";
import { warmBillPdf } from "@/lib/bill-pdf-cache";
import { pdfRenderBaseUrl } from "@/lib/pdf-cache";
import { allConsignmentsBelongToCompany } from "@/lib/bill/verify-consignments";
import { syncBillStatusAfterBillSave } from "@/lib/ledger/load-ledger";
import { isPodRequiredForBilling, lrNumbersMissingPod, podRequiredMessage } from "@/lib/bill/pod-guard";
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

    // Company rule: no billing without a POD (Settings -> requirePodBeforeBilling).
    if (await isPodRequiredForBilling(auth.companyId)) {
      const missing = await lrNumbersMissingPod(auth.companyId, parsed.items.map((i) => i.consignmentId));
      if (missing.length) {
        return NextResponse.json(
          { success: false, code: "POD_REQUIRED", message: podRequiredMessage(missing), lrNumbers: missing },
          { status: 409 }
        );
      }
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

    // Bill + the LRs' `billing` marker commit together (or are rolled back).
    let createdId: string | undefined;
    const created = await atomically(
      async (session) => {
        const [doc] = await FreightBillModel.create(
          [
            {
              ...parsed,
              items,
              totalAmount,
              payableAmount,
              // Server-controlled — never taken from the request body.
              companyId: auth.companyId,
              createdBy: auth.userId,
            },
          ],
          { session }
        );
        createdId = String(doc._id);
        await syncLrBilling({
          companyId: auth.companyId,
          bill: { id: createdId, billNo: doc.billNo, billDate: doc.billDate },
          previousLrIds: [],
          nextLrIds: parsed.items.map((i) => i.consignmentId),
          session,
        });
        return doc;
      },
      // Standalone MongoDB (no transactions): undo the bill if the LR sync fails.
      async () => {
        if (createdId) await FreightBillModel.deleteOne({ _id: createdId, ...companyFilter(auth.companyId) });
      }
    );

    // An advance on the bill already counts as payment (Partially Paid / Paid bilties).
    await syncBillStatusAfterBillSave(auth.companyId, String(created._id), { hadAdvance: false });

    // Build the PDF in the background so the first "open" is already instant.
    const cookieHeader = request.headers.get("cookie") ?? "";
    const baseUrl = pdfRenderBaseUrl(request.nextUrl.origin);
    const billId = String(created._id);
    after(() => warmBillPdf({ id: billId, companyId: auth.companyId, baseUrl, cookieHeader }));

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