import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import PaymentModel from "@/models/Payment";
import { companyFilter, requireCompanyProfile } from "@/lib/company-scope";
import { loadLedgers, syncBillPaymentStatus } from "@/lib/ledger/load-ledger";
import { allocatePaymentSchema } from "@/lib/ledger/payment-input";
import { planAllocation } from "@/lib/ledger/allocate";
import type { LedgerCustomer } from "@/lib/ledger/build-ledger";

/**
 * Records ONE received amount against the customer's open invoices, oldest
 * first. Whatever is left after every invoice is cleared is saved as an
 * unlinked payment (an advance). The split is decided here from the database,
 * never from client-sent bill amounts.
 */
export async function POST(request: Request) {
  const auth = await requireCompanyProfile();
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = allocatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    await dbConnect();
    const doc = await Customer.findOne({ $and: [companyFilter(auth.companyId), { _id: input.partyId }] }).lean();
    if (!doc) return Response.json({ success: false, message: "Customer not found." }, { status: 404 });

    const customer: LedgerCustomer = {
      _id: String(doc._id),
      name: doc.name,
      openingBalance: doc.openingBalance ?? 0,
      balanceType: doc.balanceType ?? "debit",
      createdAt: doc.createdAt,
    };
    const ledger = (await loadLedgers(auth.companyId, [customer], { includeUnbilled: false })).get(customer._id);
    if (!ledger) throw new Error("Ledger missing");

    const open = Object.values(ledger.billStatuses)
      .filter((b) => b.outstanding > 0)
      .map((b) => ({ billId: b.billId, billNo: b.billNo, billDate: b.billDate, outstanding: b.outstanding }));
    const plan = planAllocation(open, input.amount);

    const common = {
      companyId: auth.companyId,
      partyType: "customer" as const,
      partyId: doc._id,
      partyName: doc.name,
      direction: "received" as const,
      date: new Date(input.date),
      mode: input.mode,
      reference: input.reference,
      remark: input.remark,
      createdBy: auth.userId,
    };
    type Row = typeof common & { amount: number; billId?: string; billNo?: string };
    const rows: Row[] = plan.allocations.map((a) => ({ ...common, billId: a.billId, billNo: a.billNo, amount: a.amount }));
    if (plan.unapplied > 0) rows.push({ ...common, amount: plan.unapplied });

    const created = await PaymentModel.insertMany(rows);
    for (const a of plan.allocations) await syncBillPaymentStatus(auth.companyId, a.billId);

    return Response.json(
      {
        success: true,
        message: "Payment recorded successfully.",
        data: { payments: created, allocations: plan.allocations, unapplied: plan.unapplied },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error while allocating payment: ", error);
    return Response.json({ success: false, message: "Internal server error while recording payment" }, { status: 500 });
  }
}
