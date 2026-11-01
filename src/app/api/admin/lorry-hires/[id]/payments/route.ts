import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { lorryHirePaymentSchema } from "@/lib/lorry-hire/validations";
import { fail, isObjectId, recordLorryHirePayment, settleTotals } from "@/lib/lorry-hire/server";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/lorry-hires/[id]/payments — record an advance / part / final payment. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  const parsed = lorryHirePaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid payment.", 400);

  try {
    await dbConnect();
    const result = await recordLorryHirePayment({ companyId: auth.companyId, userId: auth.userId, lorryHireId: id, payment: parsed.data });
    if (!result.ok) return fail(result.message, result.status);
    return NextResponse.json({ success: true, message: "Payment recorded", data: result.data }, { status: 201 });
  } catch (error) {
    console.error("Error while adding lorry hire payment:", error);
    return fail("Error recording payment", 500);
  }
}

const deleteSchema = z.object({ paymentId: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid payment.") });

/** DELETE /api/admin/lorry-hires/[id]/payments — body { paymentId }. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid payment.", 400);
  const { paymentId } = parsed.data;

  try {
    await dbConnect();
    const scope = companyFilter(auth.companyId);

    // `new: false` hands back the contract as it was, so we know what was removed.
    const before = await LorryHireModel.findOneAndUpdate(
      { $and: [scope, { _id: id, "payments._id": paymentId }] },
      { $pull: { payments: { _id: paymentId } } },
      { new: false }
    )
      .select("payments")
      .lean();
    if (!before) return fail("Payment not found.", 404);

    const removed = before.payments.find((x) => String(x._id) === paymentId);
    const updated = await settleTotals(auth.companyId, id);

    if (removed?.ledgerPaymentId) {
      await PaymentModel.deleteOne({
        $and: [scope, { _id: removed.ledgerPaymentId, lorryHireId: id }],
      });
    }

    return NextResponse.json({ success: true, message: "Payment removed", data: updated });
  } catch (error) {
    console.error("Error while removing lorry hire payment:", error);
    return fail("Error removing payment", 500);
  }
}
