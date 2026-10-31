import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import LorryHireContractModel from "@/models/LorryHireContract";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import { contractTotalPayable } from "@/lib/ledger/build-supplier-ledger";
import { createContractSchema } from "@/lib/ledger/supplier-input";

export async function POST(request: Request) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    await dbConnect();
    const supplier = await Supplier.findOne({ $and: [companyFilter(auth.companyId), { _id: input.supplierId }] }, "name").lean();
    if (!supplier) return Response.json({ success: false, message: "Supplier not found." }, { status: 404 });

    const duplicate = await LorryHireContractModel.exists({ $and: [companyFilter(auth.companyId), { contractNo: input.contractNo }] });
    if (duplicate) {
      return Response.json({ success: false, message: `Contract ${input.contractNo} already exists.` }, { status: 409 });
    }

    const contract = await LorryHireContractModel.create({
      companyId: auth.companyId,
      supplierId: supplier._id,
      supplierName: supplier.name,
      contractNo: input.contractNo,
      date: new Date(input.date),
      vehicleNo: input.vehicleNo,
      consignmentNos: input.consignmentNos,
      hireAmount: input.hireAmount,
      otherCharges: input.otherCharges,
      deductions: input.deductions,
      tdsAmount: input.tdsAmount,
      totalPayable: contractTotalPayable(input), // never trust a client total
      advancePaid: input.advancePaid,
      advanceDate: input.advancePaid > 0 ? input.advanceDate || input.date : undefined,
      advanceVia: input.advancePaid > 0 ? input.advanceVia ?? "Cash" : undefined,
      remark: input.remark,
      createdBy: auth.userId,
    });
    return Response.json({ success: true, message: "Contract added successfully.", data: contract }, { status: 201 });
  } catch (error) {
    console.error("Error while creating lorry hire contract: ", error);
    return Response.json({ success: false, message: "Internal server error while adding the contract" }, { status: 500 });
  }
}
