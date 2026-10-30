import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import { allConsignmentsBelongToCompany } from "@/lib/bill/verify-consignments";
import { lorryHireFormSchema } from "@/lib/lorry-hire/validations";
import {
  DUPLICATE_LHC_MESSAGE,
  buildContractFields,
  fail,
  isDuplicateKey,
  isObjectId,
  itemConsignmentIds,
  refreshMirrors,
  resolveSupplier,
  settlementFrom,
  summarizeStored,
  syncConsignmentLinks,
  validationFailed,
} from "@/lib/lorry-hire/server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/admin/lorry-hires/update/[id]
 *
 * Payments are NOT edited here — they only change through
 * /[id]/payments, so the ledger mirror can never drift. Any `payments` in the
 * body are ignored and the stored ones are used for the totals.
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  await dbConnect();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = lorryHireFormSchema.parse({ ...body, payments: [] });

    const existing = await LorryHireModel.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] }).lean();
    if (!existing) return fail("Lorry hire contract not found.", 404);
    if (existing.status === "Cancelled") return fail("A cancelled contract can't be edited.", 409);

    const consignmentIds = itemConsignmentIds(parsed.items);
    if (consignmentIds.length > 0 && !(await allConsignmentsBelongToCompany(consignmentIds, auth.companyId))) {
      return fail("One or more consignments were not found.", 400);
    }

    const supplier = await resolveSupplier(auth.companyId, auth.userId, parsed.supplier);
    if (!supplier.ok) return fail(supplier.message, 400);

    const hasPayments = existing.payments.length > 0;
    if (hasPayments && String(existing.supplier.supplierId ?? "") !== String(supplier.supplierId)) {
      return fail("Remove the recorded payments before changing the supplier.", 409);
    }

    const fields = buildContractFields(parsed, supplier.supplierId);
    const summary = summarizeStored({ ...fields, payments: existing.payments });
    if (summary.overpaid > 0) {
      return fail(
        `Net payable can't be less than the ₹${summary.totalPaid.toFixed(2)} already paid. Remove a payment first.`,
        400
      );
    }

    // Optional dates that were cleared must be removed, not left as they were.
    const { loadingDate, expectedDeliveryDate, ...rest } = fields;
    const $set: Record<string, unknown> = { ...rest, settlement: settlementFrom(summary) };
    const $unset: Record<string, ""> = {};
    if (loadingDate) $set.loadingDate = loadingDate;
    else $unset.loadingDate = "";
    if (expectedDeliveryDate) $set.expectedDeliveryDate = expectedDeliveryDate;
    else $unset.expectedDeliveryDate = "";

    const updated = await LorryHireModel.findOneAndUpdate(
      { $and: [companyFilter(auth.companyId), { _id: id, status: { $ne: "Cancelled" } }] },
      Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return fail("This contract changed while you were editing. Refresh and try again.", 409);

    await syncConsignmentLinks(
      auth.companyId,
      updated._id,
      updated.lhcNo,
      consignmentIds,
      itemConsignmentIds(existing.items)
    );
    if (hasPayments) {
      await refreshMirrors(auth.companyId, updated._id, { lhcNo: updated.lhcNo, partyName: updated.supplier.name });
    }

    return NextResponse.json({ success: true, message: "Lorry hire contract updated successfully", data: updated });
  } catch (error) {
    if (error instanceof ZodError) return validationFailed(error);
    if (isDuplicateKey(error)) return fail(DUPLICATE_LHC_MESSAGE, 409);
    console.error("Error while updating lorry hire contract:", error);
    return fail("Error updating lorry hire contract", 500);
  }
}
