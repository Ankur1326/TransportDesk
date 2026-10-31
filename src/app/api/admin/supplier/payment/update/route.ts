import dbConnect from "@/lib/db";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import {
  contractOutstandingError,
  resolveContractForSupplier,
  updateSupplierPaymentSchema,
} from "@/lib/ledger/supplier-input";

export async function PUT(request: Request) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSupplierPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    await dbConnect();
    const existing = await PaymentModel.findOne({
      $and: [companyFilter(auth.companyId), { _id: input._id, partyType: "supplier" }],
    });
    if (!existing) return Response.json({ success: false, message: "Payment not found." }, { status: 404 });
    if (input.contractId && existing.direction !== "paid") {
      return Response.json({ success: false, message: "Only paid entries can be linked to a contract." }, { status: 400 });
    }

    let contractNo: string | undefined;
    if (input.contractId) {
      const contract = await resolveContractForSupplier(auth.companyId, input.contractId, String(existing.partyId));
      if (!contract.ok) return Response.json({ success: false, message: contract.message }, { status: 404 });
      contractNo = contract.contractNo;
      const tooMuch = await contractOutstandingError(auth.companyId, input.contractId, input.amount, String(existing._id));
      if (tooMuch) return Response.json({ success: false, message: tooMuch }, { status: 400 });
    }

    existing.amount = input.amount;
    existing.date = new Date(input.date);
    existing.mode = input.mode;
    existing.reference = input.reference;
    existing.remark = input.remark;
    existing.set("contractId", input.contractId || undefined);
    existing.set("contractNo", contractNo);
    await existing.save();
    return Response.json({ success: true, message: "Payment updated successfully.", data: existing });
  } catch (error) {
    console.error("Error while updating supplier payment: ", error);
    return Response.json({ success: false, message: "Internal server error while updating payment" }, { status: 500 });
  }
}
