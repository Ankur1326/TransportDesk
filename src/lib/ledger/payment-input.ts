import { z } from "zod";
import mongoose from "mongoose";
import { companyFilter } from "@/lib/company-scope";
import FreightBillModel from "@/models/Bill";
import { PAYMENT_MODES } from "@/models/Payment";
import { billBelongsToCustomer, type LedgerCustomer } from "@/lib/ledger/build-ledger";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");

const fields = {
  amount: z.coerce.number().positive("Amount must be greater than 0").max(1_000_000_000),
  date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date"),
  mode: z.enum(PAYMENT_MODES).default("Cash"),
  reference: z.string().trim().max(100).default(""),
  remark: z.string().trim().max(500).default(""),
  billId: objectId.optional().nullable(),
};

export const createPaymentSchema = z.object({
  partyId: objectId,
  direction: z.enum(["received", "receivable_adjustment"]).default("received"),
  ...fields,
});

export const updatePaymentSchema = z.object({ _id: objectId, ...fields });

export const deletePaymentSchema = z.object({ _id: objectId });

/**
 * Returns the bill's number when `billId` is a bill of this company AND of this
 * customer; otherwise an error message (never reveals other companies' bills).
 */
export async function resolveBillForCustomer(
  companyId: string,
  billId: string,
  customer: Pick<LedgerCustomer, "_id" | "name">
): Promise<{ ok: true; billNo: string } | { ok: false; message: string }> {
  const bill = await FreightBillModel.findOne(
    { $and: [companyFilter(companyId), { _id: billId }] },
    "billNo customerId billedTo.name"
  ).lean<{ billNo: string; customerId?: mongoose.Types.ObjectId; billedTo?: { name?: string } } | null>();
  if (
    !bill ||
    !billBelongsToCustomer(
      { customerId: bill.customerId ? String(bill.customerId) : null, billedToName: bill.billedTo?.name ?? "" },
      customer
    )
  ) {
    return { ok: false, message: "Bill not found for this customer." };
  }
  return { ok: true, billNo: bill.billNo };
}
