import mongoose, { type ClientSession } from "mongoose";

export { atomically } from "@/lib/with-transaction";

import { companyFilter } from "@/lib/company-scope";
import FreightBillModel from "@/models/Bill";
import ConsignmentModel from "@/models/Consignment";
import PaymentModel from "@/models/Payment";
import { buildBillingMarker, diffLrIds } from "@/lib/bill/lr-billing";

/** Server-only: keeps `Consignment.billing` in step with the Bill documents. */

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export interface SyncLrBillingInput {
  companyId: string;
  bill: { id: string; billNo: string; billDate?: Date | string | null };
  /** LR ids on the bill before this change ([] when the bill is new). */
  previousLrIds: string[];
  /** LR ids on the bill after this change ([] when the bill is deleted). */
  nextLrIds: string[];
  session?: ClientSession;
}

/**
 * Makes `billing` on every affected LR match the bill. The writes are absolute
 * (not increments), so running it twice - or after a partial failure - is safe.
 */
export async function syncLrBilling({ companyId, bill, previousLrIds, nextLrIds, session }: SyncLrBillingInput): Promise<void> {
  const scope = companyFilter(companyId);
  const { added, kept, removed } = diffLrIds(previousLrIds, nextLrIds);
  const billObjectId = oid(bill.id);

  const onBill = [...added, ...kept];
  if (onBill.length) {
    const marker = buildBillingMarker(bill);
    await ConsignmentModel.updateMany(
      { ...scope, _id: { $in: onBill.map(oid) } },
      { $set: { billing: { ...marker, billId: billObjectId } } },
      { session }
    );
  }

  if (removed.length) {
    // Only clear markers that still point at THIS bill.
    await ConsignmentModel.updateMany(
      { ...scope, _id: { $in: removed.map(oid) }, "billing.billId": billObjectId },
      { $unset: { billing: "" } },
      { session }
    );
  }
}

/** The bill an LR is on (per the Bill documents, so it works for legacy LRs). */
export async function findBillOfLr(companyId: string, lrId: string): Promise<{ _id: string; billNo: string } | null> {
  const bill = await FreightBillModel.findOne({ ...companyFilter(companyId), "items.consignmentId": oid(lrId) })
    .select("billNo")
    .lean<{ _id: mongoose.Types.ObjectId; billNo: string } | null>();
  return bill ? { _id: String(bill._id), billNo: bill.billNo } : null;
}

/** Does any received payment point at this bill? */
export async function billHasPayments(companyId: string, billId: string): Promise<boolean> {
  return Boolean(
    await PaymentModel.exists({ ...companyFilter(companyId), billId: oid(billId), direction: "received" })
  );
}
