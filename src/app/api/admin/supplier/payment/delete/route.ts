import dbConnect from "@/lib/db";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { deletePaymentSchema } from "@/lib/ledger/payment-input";

export async function DELETE(request: Request) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = deletePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }

  try {
    await dbConnect();
    // Contract status is derived from the remaining payments, so deleting is enough.
    const removed = await PaymentModel.findOneAndDelete({
      $and: [companyFilter(auth.companyId), { _id: parsed.data._id, partyType: "supplier" }],
    }).lean();
    if (!removed) return Response.json({ success: false, message: "Payment not found." }, { status: 404 });
    return Response.json({ success: true, message: "Payment deleted successfully." });
  } catch (error) {
    console.error("Error while deleting supplier payment: ", error);
    return Response.json({ success: false, message: "Internal server error while deleting payment" }, { status: 500 });
  }
}
