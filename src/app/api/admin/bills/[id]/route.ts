import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { atomically, billHasPayments, syncLrBilling } from "@/lib/bill/lr-billing-sync";

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * DELETE /api/admin/bills/:id
 * Refused while payments are recorded against the bill. Releases the bill's
 * LRs (clears their `billing` marker) in the same transaction as the delete.
 */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid bill id", 400);

  await dbConnect();

  try {
    const scope = { _id: id, ...companyFilter(auth.companyId) };
    const bill = await FreightBillModel.findOne(scope).lean();
    if (!bill) return fail("Bill not found", 404);

    if (await billHasPayments(auth.companyId, id)) {
      return fail(`Bill ${bill.billNo} has payments recorded against it. Delete those payments before deleting the bill.`, 409);
    }

    const lrIds = (bill.items ?? []).map((i) => String(i.consignmentId));
    await atomically(
      async (session) => {
        await FreightBillModel.deleteOne(scope, { session });
        await syncLrBilling({
          companyId: auth.companyId,
          bill: { id, billNo: bill.billNo, billDate: bill.billDate },
          previousLrIds: lrIds,
          nextLrIds: [],
          session,
        });
      },
      // Standalone MongoDB (no transactions): bring the bill back if releasing its LRs failed.
      async () => {
        await FreightBillModel.replaceOne(scope, bill, { upsert: true });
        await syncLrBilling({
          companyId: auth.companyId,
          bill: { id, billNo: bill.billNo, billDate: bill.billDate },
          previousLrIds: [],
          nextLrIds: lrIds,
        });
      }
    );

    return NextResponse.json({ success: true, message: "Bill deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error while deleting bill:", error);
    return fail("Error deleting bill", 500);
  }
}
