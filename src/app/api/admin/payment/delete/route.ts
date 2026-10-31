import dbConnect from "@/lib/db";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { syncBillPaymentStatus } from "@/lib/ledger/load-ledger";
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
    // Supplier payments on a lorry hire contract are managed from the contract.
    const linked = await PaymentModel.exists({
      $and: [companyFilter(auth.companyId), { _id: parsed.data._id, lorryHireId: { $exists: true } }],
    });
    if (linked) {
      return Response.json(
        { success: false, message: "This payment belongs to a lorry hire contract. Remove it from the contract." },
        { status: 409 }
      );
    }
    const removed = await PaymentModel.findOneAndDelete({
      $and: [companyFilter(auth.companyId), { _id: parsed.data._id, partyType: "customer" }],
    }).lean();
    if (!removed) return Response.json({ success: false, message: "Payment not found." }, { status: 404 });

    // Reverts consignment status to "Partially Paid" / "Pending" when needed.
    if (removed.billId) await syncBillPaymentStatus(auth.companyId, String(removed.billId));
    return Response.json({ success: true, message: "Payment deleted successfully." });
  } catch (error) {
    console.error("Error while deleting payment: ", error);
    return Response.json({ success: false, message: "Internal server error while deleting payment" }, { status: 500 });
  }
}
