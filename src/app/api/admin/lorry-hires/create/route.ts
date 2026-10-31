import mongoose from "mongoose";
import { after, NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { requireCompanyProfile } from "@/lib/company-scope";
import { warmLorryHirePdf } from "@/lib/lorry-hire/pdf-cache";
import { pdfRenderBaseUrl } from "@/lib/pdf-cache";
import { allConsignmentsBelongToCompany } from "@/lib/bill/verify-consignments";
import { lorryHireFormSchema, summarizeLorryHireForm } from "@/lib/lorry-hire/validations";
import {
  DUPLICATE_LHC_MESSAGE,
  buildContractFields,
  fail,
  insertMirrors,
  isDuplicateKey,
  itemConsignmentIds,
  mirrorPaymentDoc,
  resolveSupplier,
  settlementFrom,
  syncConsignmentLinks,
  validationFailed,
} from "@/lib/lorry-hire/server";

export async function POST(request: NextRequest) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const parsed = lorryHireFormSchema.parse(await request.json());

    const consignmentIds = itemConsignmentIds(parsed.items);
    if (consignmentIds.length > 0 && !(await allConsignmentsBelongToCompany(consignmentIds, auth.companyId))) {
      return fail("One or more consignments were not found.", 400);
    }

    const supplier = await resolveSupplier(auth.companyId, auth.userId, parsed.supplier);
    if (!supplier.ok) return fail(supplier.message, 400);

    // Never trust client totals — recompute everything server-side.
    const summary = summarizeLorryHireForm(parsed);
    const now = new Date();

    const payments = parsed.payments.map((p) => ({
      _id: new mongoose.Types.ObjectId(),
      ledgerPaymentId: new mongoose.Types.ObjectId(),
      kind: p.kind,
      amount: p.amount,
      date: p.date,
      mode: p.mode,
      reference: p.reference,
      paidTo: p.paidTo,
      remark: p.remark,
    }));

    const created = await LorryHireModel.create({
      ...buildContractFields(parsed, supplier.supplierId),
      payments,
      settlement: settlementFrom(summary),
      status: "Hired",
      statusHistory: [{ status: "Hired", at: now, by: auth.userId }],
      // Server-controlled — never taken from the request body.
      companyId: auth.companyId,
      createdBy: auth.userId,
    });

    await insertMirrors(
      payments.map((p) =>
        mirrorPaymentDoc({
          companyId: auth.companyId,
          userId: auth.userId,
          ledgerId: p.ledgerPaymentId,
          contract: {
            _id: created._id as mongoose.Types.ObjectId,
            lhcNo: created.lhcNo,
            supplierId: supplier.supplierId,
            supplierName: created.supplier.name,
          },
          payment: p,
        })
      )
    );
    await syncConsignmentLinks(auth.companyId, created._id as mongoose.Types.ObjectId, created.lhcNo, consignmentIds, []);

    // Build the PDF in the background so the first "open" is already instant.
    const cookieHeader = request.headers.get("cookie") ?? "";
    const baseUrl = pdfRenderBaseUrl(request.nextUrl.origin);
    const contractId = String(created._id);
    after(() => warmLorryHirePdf({ id: contractId, companyId: auth.companyId, baseUrl, cookieHeader }));

    return NextResponse.json(
      { success: true, message: "Lorry hire contract created successfully", data: created },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) return validationFailed(error);
    if (isDuplicateKey(error)) return fail(DUPLICATE_LHC_MESSAGE, 409);
    console.error("Error while creating lorry hire contract:", error);
    return fail("Error creating lorry hire contract", 500);
  }
}
