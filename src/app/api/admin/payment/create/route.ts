import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import { syncBillPaymentStatus } from "@/lib/ledger/load-ledger";
import { billOutstandingError, createPaymentSchema, resolveBillForCustomer } from "@/lib/ledger/payment-input";

export async function POST(request: Request) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;
  if (input.billId && input.direction !== "received") {
    return Response.json({ success: false, message: "Only received payments can be linked to a bill." }, { status: 400 });
  }

  try {
    await dbConnect();
    const customer = await Customer.findOne({ $and: [companyFilter(auth.companyId), { _id: input.partyId }] }, "name").lean();
    if (!customer) return Response.json({ success: false, message: "Customer not found." }, { status: 404 });

    let billNo: string | undefined;
    if (input.billId) {
      const bill = await resolveBillForCustomer(auth.companyId, input.billId, { _id: String(customer._id), name: customer.name });
      if (!bill.ok) return Response.json({ success: false, message: bill.message }, { status: 404 });
      billNo = bill.billNo;
      const tooMuch = await billOutstandingError(auth.companyId, input.billId, input.amount);
      if (tooMuch) return Response.json({ success: false, message: tooMuch }, { status: 400 });
    }

    const payment = await PaymentModel.create({
      companyId: auth.companyId,
      partyType: "customer",
      partyId: customer._id,
      partyName: customer.name,
      direction: input.direction,
      billId: input.billId || undefined,
      billNo,
      amount: input.amount,
      date: new Date(input.date),
      mode: input.mode,
      reference: input.reference,
      remark: input.remark,
      createdBy: auth.userId,
    });
    if (input.billId) await syncBillPaymentStatus(auth.companyId, input.billId);

    return Response.json({ success: true, message: "Payment recorded successfully.", data: payment }, { status: 201 });
  } catch (error) {
    console.error("Error while creating payment: ", error);
    return Response.json({ success: false, message: "Internal server error while recording payment" }, { status: 500 });
  }
}
