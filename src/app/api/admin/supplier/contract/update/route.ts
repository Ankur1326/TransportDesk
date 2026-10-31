import dbConnect from "@/lib/db";
import LorryHireContractModel from "@/models/LorryHireContract";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { contractTotalPayable } from "@/lib/ledger/build-supplier-ledger";
import { getContractOutstanding } from "@/lib/ledger/load-supplier-ledger";
import { updateContractSchema } from "@/lib/ledger/supplier-input";

export async function PUT(request: Request) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = updateContractSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    await dbConnect();
    const scope = companyFilter(auth.companyId);
    const existing = await LorryHireContractModel.findOne({ $and: [scope, { _id: input._id }] });
    if (!existing) return Response.json({ success: false, message: "Contract not found." }, { status: 404 });

    if (input.contractNo !== existing.contractNo) {
      const duplicate = await LorryHireContractModel.exists({ $and: [scope, { contractNo: input.contractNo, _id: { $ne: existing._id } }] });
      if (duplicate) return Response.json({ success: false, message: `Contract ${input.contractNo} already exists.` }, { status: 409 });
    }

    const total = contractTotalPayable(input);
    // Payments already linked to this contract (outside the advance). The new total must still cover
    // them plus the new advance, otherwise an overpayment would be hidden.
    const outstandingNow = (await getContractOutstanding(auth.companyId, String(existing._id))) ?? 0;
    const linkedPaidPaise = Math.round((existing.totalPayable - existing.advancePaid - outstandingNow) * 100);
    if (Math.round(total * 100) < Math.round(input.advancePaid * 100) + Math.max(0, linkedPaidPaise)) {
      return Response.json(
        { success: false, message: "The new total is less than what is already paid on this contract. Edit or delete those payments first." },
        { status: 400 }
      );
    }

    existing.set({
      contractNo: input.contractNo,
      date: new Date(input.date),
      vehicleNo: input.vehicleNo,
      consignmentNos: input.consignmentNos,
      hireAmount: input.hireAmount,
      otherCharges: input.otherCharges,
      deductions: input.deductions,
      tdsAmount: input.tdsAmount,
      totalPayable: total,
      advancePaid: input.advancePaid,
      advanceDate: input.advancePaid > 0 ? input.advanceDate || input.date : undefined,
      advanceVia: input.advancePaid > 0 ? input.advanceVia ?? "Cash" : undefined,
      remark: input.remark,
    });
    await existing.save();
    return Response.json({ success: true, message: "Contract updated successfully.", data: existing });
  } catch (error) {
    console.error("Error while updating lorry hire contract: ", error);
    return Response.json({ success: false, message: "Internal server error while updating the contract" }, { status: 500 });
  }
}
