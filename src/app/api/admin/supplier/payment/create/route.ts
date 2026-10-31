import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import {
  contractOutstandingError,
  createSupplierPaymentSchema,
  resolveContractForSupplier,
} from "@/lib/ledger/supplier-input";

/**
 * "Paid (Debit)" (optionally linked to one contract) or a manual
 * "Payable (Credit)" entry for a supplier. Contract statuses are derived from
 * the ledger, so there is nothing to sync afterwards.
 */
export async function POST(request: Request) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = createSupplierPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;
  if (input.contractId && input.direction !== "paid") {
    return Response.json({ success: false, message: "Only paid entries can be linked to a contract." }, { status: 400 });
  }

  try {
    await dbConnect();
    const supplier = await Supplier.findOne({ $and: [companyFilter(auth.companyId), { _id: input.partyId }] }, "name").lean();
    if (!supplier) return Response.json({ success: false, message: "Supplier not found." }, { status: 404 });

    let contractNo: string | undefined;
    if (input.contractId) {
      const contract = await resolveContractForSupplier(auth.companyId, input.contractId, String(supplier._id));
      if (!contract.ok) return Response.json({ success: false, message: contract.message }, { status: 404 });
      contractNo = contract.contractNo;
      const tooMuch = await contractOutstandingError(auth.companyId, input.contractId, input.amount);
      if (tooMuch) return Response.json({ success: false, message: tooMuch }, { status: 400 });
    }

    const payment = await PaymentModel.create({
      companyId: auth.companyId,
      partyType: "supplier",
      partyId: supplier._id,
      partyName: supplier.name,
      direction: input.direction,
      contractId: input.contractId || undefined,
      contractNo,
      amount: input.amount,
      date: new Date(input.date),
      mode: input.mode,
      reference: input.reference,
      remark: input.remark,
      createdBy: auth.userId,
    });
    return Response.json({ success: true, message: "Payment recorded successfully.", data: payment }, { status: 201 });
  } catch (error) {
    console.error("Error while creating supplier payment: ", error);
    return Response.json({ success: false, message: "Internal server error while recording payment" }, { status: 500 });
  }
}
