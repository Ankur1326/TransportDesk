import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { lorryHirePaymentSchema } from "@/lib/lorry-hire/validations";
import {
  LIST_EXCLUDE,
  fail,
  insertMirrors,
  isObjectId,
  mirrorPaymentDoc,
  paymentTotals,
} from "@/lib/lorry-hire/server";

type Ctx = { params: Promise<{ id: string }> };

const paise = (n: number) => Math.round(n * 100);

/** Re-write totalPaid / balance / paymentStatus exactly from the stored payments. */
async function settleTotals(companyId: string, id: string) {
  const doc = await LorryHireModel.findOne({ $and: [companyFilter(companyId), { _id: id }] })
    .select("settlement.netPayable payments.amount")
    .lean();
  if (!doc) return null;
  const t = paymentTotals(doc.settlement.netPayable, doc.payments);
  return LorryHireModel.findOneAndUpdate(
    { $and: [companyFilter(companyId), { _id: id }] },
    {
      $set: {
        "settlement.totalPaid": t.totalPaid,
        "settlement.balance": t.balance,
        "settlement.paymentStatus": t.paymentStatus,
      },
    },
    { new: true }
  )
    .select(LIST_EXCLUDE)
    .lean();
}

/** POST /api/admin/lorry-hires/[id]/payments — record an advance / part / final payment. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  const parsed = lorryHirePaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid payment.", 400);
  const p = parsed.data;

  try {
    await dbConnect();
    const scope = companyFilter(auth.companyId);
    const existing = await LorryHireModel.findOne({ $and: [scope, { _id: id }] })
      .select("status lhcNo supplier settlement")
      .lean();
    if (!existing) return fail("Lorry hire contract not found.", 404);
    if (existing.status === "Cancelled") return fail("Payments can't be added to a cancelled contract.", 409);
    if (paise(p.amount) > paise(existing.settlement.balance)) {
      return fail(`Payment exceeds the balance of ₹${existing.settlement.balance.toFixed(2)}.`, 400);
    }

    const paymentId = new mongoose.Types.ObjectId();
    const ledgerId = new mongoose.Types.ObjectId();

    // One atomic step: only applies while the balance still covers the amount,
    // so two simultaneous payments can't overpay the contract.
    const pushed = await LorryHireModel.findOneAndUpdate(
      { $and: [scope, { _id: id, status: { $ne: "Cancelled" }, "settlement.balance": { $gte: p.amount } }] },
      {
        $push: {
          payments: {
            _id: paymentId,
            ledgerPaymentId: ledgerId,
            kind: p.kind,
            amount: p.amount,
            date: p.date,
            mode: p.mode,
            reference: p.reference,
            paidTo: p.paidTo,
            remark: p.remark,
          },
        },
        $inc: { "settlement.totalPaid": p.amount, "settlement.balance": -p.amount },
      },
      { new: true }
    )
      .select("_id")
      .lean();
    if (!pushed) return fail("The balance changed. Refresh and try again.", 409);

    const updated = await settleTotals(auth.companyId, id);

    const supplierId = existing.supplier.supplierId;
    if (supplierId) {
      await insertMirrors([
        mirrorPaymentDoc({
          companyId: auth.companyId,
          userId: auth.userId,
          ledgerId,
          contract: { _id: id, lhcNo: existing.lhcNo, supplierId, supplierName: existing.supplier.name },
          payment: p,
        }),
      ]);
    }

    return NextResponse.json({ success: true, message: "Payment recorded", data: updated }, { status: 201 });
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
