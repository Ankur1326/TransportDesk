import { z } from "zod";
import mongoose from "mongoose";
import { companyFilter } from "@/lib/company-scope";
import FreightBillModel from "@/models/Bill";
import { PAYMENT_MODES } from "@/lib/ledger/payment-modes";
import { billBelongsToCustomer, round2, type LedgerCustomer } from "@/lib/ledger/build-ledger";
import { formatInr } from "@/lib/ledger/format";
import { getBillOutstanding } from "@/lib/ledger/load-ledger";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");

const baseFields = {
  amount: z.coerce.number().positive("Amount must be greater than 0").max(1_000_000_000),
  date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date"),
  mode: z.enum(PAYMENT_MODES).default("Cash"),
  reference: z.string().trim().max(100).default(""),
  remark: z.string().trim().max(500).default(""),
};

const fields = { ...baseFields, billId: objectId.optional().nullable() };

export const createPaymentSchema = z.object({
  partyId: objectId,
  direction: z.enum(["received", "receivable_adjustment"]).default("received"),
  ...fields,
});

export const updatePaymentSchema = z.object({ _id: objectId, ...fields });

/** One amount split over the customer's open invoices, oldest first (never linked to a chosen bill). */
export const allocatePaymentSchema = z.object({ partyId: objectId, ...baseFields });

export const deletePaymentSchema = z.object({ _id: objectId });

/**
 * A payment linked to a bill may not exceed what is still outstanding on it
 * (`excludePaymentId` = the payment being edited, so it isn't counted twice).
 * Returns an error message, or null when the amount fits. The extra money
 * belongs unlinked, where it stays as an advance.
 */
export async function billOutstandingError(
  companyId: string,
  billId: string,
  amount: number,
  excludePaymentId?: string
): Promise<string | null> {
  const outstanding = await getBillOutstanding(companyId, billId, excludePaymentId);
  if (outstanding === null) return null; // missing bill is reported by resolveBillForCustomer
  if (Math.round(round2(amount) * 100) <= Math.round(outstanding * 100)) return null;
  return outstanding <= 0
    ? "This bill is already fully paid. Record the amount without a bill to keep it as an advance."
    : `This bill has only ${formatInr(outstanding)} outstanding. Record the extra amount without a bill (kept as an advance) or use auto-apply.`;
}

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
