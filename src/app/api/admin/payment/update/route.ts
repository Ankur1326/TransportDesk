import dbConnect from "@/lib/db";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { syncBillPaymentStatus } from "@/lib/ledger/load-ledger";
import { billOutstandingError, resolveBillForCustomer, updatePaymentSchema } from "@/lib/ledger/payment-input";

export async function PUT(request: Request) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = updatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    await dbConnect();
    const existing = await PaymentModel.findOne({ $and: [companyFilter(auth.companyId), { _id: input._id }] });
    if (!existing) return Response.json({ success: false, message: "Payment not found." }, { status: 404 });
    if (input.billId && existing.direction !== "received") {
      return Response.json({ success: false, message: "Only received payments can be linked to a bill." }, { status: 400 });
    }

    const oldBillId = existing.billId ? String(existing.billId) : null;
    let billNo: string | undefined;
    if (input.billId) {
      const bill = await resolveBillForCustomer(auth.companyId, input.billId, {
        _id: String(existing.partyId),
        name: existing.partyName,
      });
      if (!bill.ok) return Response.json({ success: false, message: bill.message }, { status: 404 });
      billNo = bill.billNo;
      const tooMuch = await billOutstandingError(auth.companyId, input.billId, input.amount, String(existing._id));
      if (tooMuch) return Response.json({ success: false, message: tooMuch }, { status: 400 });
    }

    existing.amount = input.amount;
    existing.date = new Date(input.date);
    existing.mode = input.mode;
    existing.reference = input.reference;
    existing.remark = input.remark;
    existing.set("billId", input.billId || undefined);
    existing.set("billNo", billNo);
    await existing.save();

    // Recompute both the old and the new bill (amount reduced / bill changed).
    for (const id of new Set([oldBillId, input.billId].filter((v): v is string => Boolean(v)))) {
      await syncBillPaymentStatus(auth.companyId, id);
    }
    return Response.json({ success: true, message: "Payment updated successfully.", data: existing });
  } catch (error) {
    console.error("Error while updating payment: ", error);
    return Response.json({ success: false, message: "Internal server error while updating payment" }, { status: 500 });
  }
}
