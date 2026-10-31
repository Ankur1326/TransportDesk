import dbConnect from "@/lib/db";
import LorryHireContractModel from "@/models/LorryHireContract";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { deleteContractSchema } from "@/lib/ledger/supplier-input";

export async function DELETE(request: Request) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = deleteContractSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }

  try {
    await dbConnect();
    const scope = companyFilter(auth.companyId);
    const hasPayments = await PaymentModel.exists({ $and: [scope, { contractId: parsed.data._id }] });
    if (hasPayments) {
      return Response.json(
        { success: false, message: "This contract has payments recorded against it. Delete those payments first." },
        { status: 409 }
      );
    }
    const removed = await LorryHireContractModel.findOneAndDelete({ $and: [scope, { _id: parsed.data._id }] }).lean();
    if (!removed) return Response.json({ success: false, message: "Contract not found." }, { status: 404 });
    return Response.json({ success: true, message: "Contract deleted successfully." });
  } catch (error) {
    console.error("Error while deleting lorry hire contract: ", error);
    return Response.json({ success: false, message: "Internal server error while deleting the contract" }, { status: 500 });
  }
}
