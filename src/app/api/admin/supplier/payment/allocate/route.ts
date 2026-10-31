import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import { loadSupplierLedgers } from "@/lib/ledger/load-supplier-ledger";
import { allocateSupplierPaymentSchema } from "@/lib/ledger/supplier-input";
import { planAllocation } from "@/lib/ledger/allocate";
import type { LedgerSupplier } from "@/lib/ledger/build-supplier-ledger";

/**
 * Records ONE paid amount against the supplier's open contracts, oldest first.
 * Whatever is left after every contract is cleared is saved as an unlinked
 * payment (an advance paid). The split is decided here from the database,
 * never from client-sent contract amounts.
 */
export async function POST(request: Request) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = allocateSupplierPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    await dbConnect();
    const doc = await Supplier.findOne({ $and: [companyFilter(auth.companyId), { _id: input.partyId }] }).lean();
    if (!doc) return Response.json({ success: false, message: "Supplier not found." }, { status: 404 });

    const supplier: LedgerSupplier = {
      _id: String(doc._id),
      name: doc.name,
      openingBalance: doc.openingBalance ?? 0,
      balanceType: doc.balanceType ?? "debit",
      createdAt: doc.createdAt,
    };
    const ledger = (await loadSupplierLedgers(auth.companyId, [supplier])).get(supplier._id);
    if (!ledger) throw new Error("Ledger missing");

    const open = Object.values(ledger.billStatuses)
      .filter((c) => c.outstanding > 0)
      .map((c) => ({ billId: c.billId, billNo: c.billNo, billDate: c.billDate, outstanding: c.outstanding }));
    const plan = planAllocation(open, input.amount);

    const common = {
      companyId: auth.companyId,
      partyType: "supplier" as const,
      partyId: doc._id,
      partyName: doc.name,
      direction: "paid" as const,
      date: new Date(input.date),
      mode: input.mode,
      reference: input.reference,
      remark: input.remark,
      createdBy: auth.userId,
    };
    type Row = typeof common & { amount: number; contractId?: string; contractNo?: string };
    const rows: Row[] = plan.allocations.map((a) => ({ ...common, contractId: a.billId, contractNo: a.billNo, amount: a.amount }));
    if (plan.unapplied > 0) rows.push({ ...common, amount: plan.unapplied });

    const created = await PaymentModel.insertMany(rows);
    return Response.json(
      {
        success: true,
        message: "Payment recorded successfully.",
        data: { payments: created, allocations: plan.allocations, unapplied: plan.unapplied },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error while allocating supplier payment: ", error);
    return Response.json({ success: false, message: "Internal server error while recording payment" }, { status: 500 });
  }
}
