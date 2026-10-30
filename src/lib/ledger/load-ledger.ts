import mongoose from "mongoose";
import { companyFilter } from "@/lib/company-scope";
import FreightBillModel from "@/models/Bill";
import ConsignmentModel from "@/models/Consignment";
import PaymentModel from "@/models/Payment";
import {
  billBelongsToCustomer,
  billedPartyName,
  buildLedger,
  computeBillStatuses,
  normName,
  type LedgerBill,
  type LedgerConsignment,
  type LedgerCustomer,
  type LedgerOptions,
  type LedgerPayment,
  type LedgerResult,
} from "@/lib/ledger/build-ledger";

/** Case-insensitive exact matching for party names. */
const CI = { locale: "en", strength: 2 } as const;

export const isObjectId = (v: unknown): v is string => typeof v === "string" && mongoose.isValidObjectId(v);

interface BillLean {
  _id: mongoose.Types.ObjectId;
  billNo: string;
  billDate: Date;
  totalAmount: number;
  customerId?: mongoose.Types.ObjectId;
  billedTo: { name: string };
  items: { consignmentId: mongoose.Types.ObjectId; cnsNo: string; freightAmt: number }[];
  adjustments?: { advanceReceived?: number; advanceDate?: string; advanceVia?: string };
}

interface PaymentLean {
  _id: mongoose.Types.ObjectId;
  partyId: mongoose.Types.ObjectId;
  direction: LedgerPayment["direction"];
  billId?: mongoose.Types.ObjectId;
  billNo?: string;
  amount: number;
  date: Date;
  mode?: string;
  reference?: string;
  remark?: string;
}

interface ConsignmentLean {
  _id: mongoose.Types.ObjectId;
  consignmentNumber: string;
  bookingDate: Date;
  charges?: { freight?: number };
  consignor?: { name?: string };
  consignee?: { name?: string };
  payment?: {
    billingParty?: string;
    billingAccount?: string;
    status?: string;
    receivedMoney?: string;
    receivedDate?: string;
    receivedType?: string;
    UTRNumber?: string;
    mrNumber?: string;
  };
}

const toBill = (b: BillLean): LedgerBill => ({
  _id: String(b._id),
  billNo: b.billNo,
  billDate: b.billDate,
  totalAmount: b.totalAmount ?? 0,
  customerId: b.customerId ? String(b.customerId) : null,
  billedToName: b.billedTo?.name ?? "",
  items: (b.items ?? []).map((i) => ({
    consignmentId: String(i.consignmentId),
    cnsNo: i.cnsNo,
    freightAmt: i.freightAmt ?? 0,
  })),
  advanceReceived: b.adjustments?.advanceReceived ?? 0,
  advanceDate: b.adjustments?.advanceDate,
  advanceVia: b.adjustments?.advanceVia,
});

const toPayment = (p: PaymentLean): LedgerPayment => ({
  _id: String(p._id),
  direction: p.direction,
  billId: p.billId ? String(p.billId) : null,
  billNo: p.billNo,
  amount: p.amount,
  date: p.date,
  mode: p.mode,
  reference: p.reference,
  remark: p.remark,
});

const toConsignment = (c: ConsignmentLean): LedgerConsignment => ({
  _id: String(c._id),
  consignmentNumber: c.consignmentNumber,
  bookingDate: c.bookingDate,
  freight: c.charges?.freight ?? 0,
  consignorName: c.consignor?.name,
  consigneeName: c.consignee?.name,
  billingParty: c.payment?.billingParty,
  billingAccount: c.payment?.billingAccount,
  paymentStatus: c.payment?.status,
  receivedMoney: c.payment?.receivedMoney,
  receivedDate: c.payment?.receivedDate,
  receivedType: c.payment?.receivedType,
  UTRNumber: c.payment?.UTRNumber,
  mrNumber: c.payment?.mrNumber,
});

/**
 * Loads everything needed for a set of customers with 4 bulk queries (never
 * one per customer) and returns one ledger per customer. Every query is
 * filtered by companyId.
 */
export async function loadLedgers(
  companyId: string,
  customers: LedgerCustomer[],
  options: LedgerOptions = {}
): Promise<Map<string, LedgerResult>> {
  const result = new Map<string, LedgerResult>();
  if (customers.length === 0) return result;

  const ids = customers.map((c) => new mongoose.Types.ObjectId(c._id));
  const names = customers.map((c) => c.name.trim());
  const scope = companyFilter(companyId);

  const [bills, payments, consignments] = await Promise.all([
    FreightBillModel.find(
      { $and: [scope, { $or: [{ customerId: { $in: ids } }, { "billedTo.name": { $in: names } }] }] },
      "billNo billDate totalAmount customerId billedTo.name items.consignmentId items.cnsNo items.freightAmt adjustments.advanceReceived adjustments.advanceDate adjustments.advanceVia"
    )
      .collation(CI)
      .lean<BillLean[]>(),
    PaymentModel.find(
      { $and: [scope, { partyType: "customer", partyId: { $in: ids } }] },
      "partyId direction billId billNo amount date mode reference remark"
    ).lean<PaymentLean[]>(),
    ConsignmentModel.find(
      {
        $and: [
          scope,
          { status: { $ne: "Cancelled" }, "payment.status": { $ne: "Cancelled" } },
          {
            $or: [
              { "payment.billingParty": "Consignor", "consignor.name": { $in: names } },
              { "payment.billingParty": "Consignee", "consignee.name": { $in: names } },
              { "payment.billingParty": "Third Party", "payment.billingAccount": { $in: names } },
            ],
          },
        ],
      },
      "consignmentNumber bookingDate charges.freight consignor.name consignee.name payment"
    )
      .collation(CI)
      .lean<ConsignmentLean[]>(),
  ]);

  // Which of those bilties sit on ANY bill of this company?
  const billed =
    consignments.length === 0
      ? []
      : await FreightBillModel.distinct("items.consignmentId", {
          $and: [scope, { "items.consignmentId": { $in: consignments.map((c) => c._id) } }],
        });

  const ledgerBills = bills.map(toBill);
  const ledgerConsignments = consignments.map(toConsignment);
  const billedIds = billed.map(String);

  for (const customer of customers) {
    const myBills = ledgerBills.filter((b) => billBelongsToCustomer(b, customer));
    const myPayments = payments.filter((p) => String(p.partyId) === String(customer._id)).map(toPayment);
    const key = normName(customer.name);
    const myConsignments = ledgerConsignments.filter((c) => billedPartyName(c) === key);
    result.set(
      String(customer._id),
      buildLedger({
        customer,
        bills: myBills,
        payments: myPayments,
        consignments: myConsignments,
        billedConsignmentIds: billedIds,
        options,
      })
    );
  }
  return result;
}

/**
 * What is still unpaid on one bill (total - advance - linked received payments),
 * or null when the bill isn't one of this company's. `excludePaymentId` leaves
 * one payment out, for editing it.
 */
export async function getBillOutstanding(
  companyId: string,
  billId: string,
  excludePaymentId?: string
): Promise<number | null> {
  const scope = companyFilter(companyId);
  const bill = await FreightBillModel.findOne(
    { $and: [scope, { _id: billId }] },
    "billNo billDate totalAmount items.consignmentId adjustments.advanceReceived"
  ).lean<BillLean | null>();
  if (!bill) return null;

  const match: Record<string, unknown> = { billId, direction: "received" };
  if (excludePaymentId) match._id = { $ne: excludePaymentId };
  const payments = await PaymentModel.find({ $and: [scope, match] }, "direction billId amount date").lean<
    PaymentLean[]
  >();
  return computeBillStatuses([toBill(bill)], payments.map(toPayment))[String(bill._id)].outstanding;
}

/**
 * Call after a bill is created or edited. Its total or advance may have changed,
 * so the bilties' payment status is recomputed - but only for bills that have
 * payment activity (an advance now or before, or recorded payments), so plain
 * unpaid bills never overwrite a status someone set by hand on a bilty.
 * Never throws: the bill itself is already saved.
 */
export async function syncBillStatusAfterBillSave(
  companyId: string,
  billId: string,
  opts: { hadAdvance: boolean }
): Promise<void> {
  try {
    const scope = companyFilter(companyId);
    const bill = await FreightBillModel.findOne({ $and: [scope, { _id: billId }] }, "adjustments.advanceReceived").lean<{
      adjustments?: { advanceReceived?: number };
    } | null>();
    if (!bill) return;
    const hasAdvance = (bill.adjustments?.advanceReceived ?? 0) > 0;
    const hasPayments = Boolean(await PaymentModel.exists({ $and: [scope, { billId, direction: "received" }] }));
    if (hasAdvance || opts.hadAdvance || hasPayments) await syncBillPaymentStatus(companyId, billId);
  } catch (error) {
    console.error("Error while syncing bill payment status: ", error);
  }
}

/**
 * Recomputes a bill's status from its advance + linked payments and mirrors it
 * onto the bill's consignments (Paid / Partially Paid / Pending). Cancelled
 * bilties are left alone.
 */
export async function syncBillPaymentStatus(companyId: string, billId: string): Promise<void> {
  const scope = companyFilter(companyId);
  const bill = await FreightBillModel.findOne(
    { $and: [scope, { _id: billId }] },
    "billNo totalAmount items.consignmentId adjustments.advanceReceived"
  ).lean<BillLean | null>();
  if (!bill) return;

  const payments = await PaymentModel.find(
    { $and: [scope, { billId, direction: "received" }] },
    "direction billId amount date"
  ).lean<PaymentLean[]>();

  const info = computeBillStatuses([toBill(bill)], payments.map(toPayment))[String(bill._id)];
  const paymentStatus =
    info.status === "Paid" ? "Paid" : info.status === "Partial" ? "Partially Paid" : "Pending";

  await ConsignmentModel.updateMany(
    {
      $and: [
        scope,
        { _id: { $in: bill.items.map((i) => i.consignmentId) } },
        { "payment.status": { $ne: "Cancelled" } },
      ],
    },
    { $set: { "payment.status": paymentStatus } }
  );
}
