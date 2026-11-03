import dbConnect from "@/lib/db";
import { buildActivity, type RawActivity } from "@/lib/dashboard/build-activity";
import { type DashboardRange } from "@/lib/dashboard/shared";
import { activityCompanyMatch, activityPaymentMatch } from "@/lib/dashboard/loader-scopes";
import ConsignmentModel from "@/models/Consignment";
import FreightBillModel from "@/models/Bill";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";

export async function loadActivity(companyId: string, _range: DashboardRange) {
  void _range;
  await dbConnect();
  const [lrs, bills, payments, hires] = await Promise.all([
    ConsignmentModel.find(activityCompanyMatch(companyId))
      .select("consignmentNumber consignor.name to.location createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    FreightBillModel.find(activityCompanyMatch(companyId))
      .select("billNo billedTo.name payableAmount totalAmount createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    PaymentModel.find(activityPaymentMatch(companyId))
      .select("direction amount partyName partyType partyId createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    LorryHireModel.find(activityCompanyMatch(companyId))
      .select("lhcNo supplier.name truck.vehicleNumber createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);
  const events: RawActivity[] = [
    ...lrs.map((lr): RawActivity => ({
      type: "lr_created",
      id: String(lr._id),
      at: lr.createdAt,
      lrNo: lr.consignmentNumber,
      consignor: lr.consignor?.name,
      to: lr.to?.location,
    })),
    ...bills.map((bill): RawActivity => ({
      type: "bill_created",
      id: String(bill._id),
      at: bill.createdAt,
      billNo: bill.billNo,
      party: bill.billedTo?.name,
      amount: bill.payableAmount ?? bill.totalAmount ?? 0,
    })),
    ...payments.map((payment): RawActivity => ({
      type: "payment",
      id: String(payment._id),
      at: payment.createdAt,
      direction: payment.direction as "received" | "paid",
      amount: payment.amount,
      party: payment.partyName,
      partyType: payment.partyType,
      partyId: String(payment.partyId),
    })),
    ...hires.map((hire): RawActivity => ({
      type: "lhc_created",
      id: String(hire._id),
      at: hire.createdAt,
      lhcNo: hire.lhcNo,
      supplier: hire.supplier?.name,
      vehicle: hire.truck?.vehicleNumber,
    })),
  ];
  return buildActivity(events);
}
