import { NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { LORRY_HIRE_STATUSES, PAYMENT_STATUSES } from "@/lib/lorry-hire/constants";
import { fail } from "@/lib/lorry-hire/server";

/** Tab counts for the list page: by lifecycle status and by payment status (cancelled excluded from the latter). */
export async function GET() {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const match = companyFilter(auth.companyId);
    const [byStatusRows, byPaymentRows] = await Promise.all([
      LorryHireModel.aggregate<{ _id: string; n: number }>([
        { $match: match },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
      LorryHireModel.aggregate<{ _id: string; n: number }>([
        { $match: { $and: [match, { status: { $ne: "Cancelled" } }] } },
        { $group: { _id: "$settlement.paymentStatus", n: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = Object.fromEntries(LORRY_HIRE_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const r of byStatusRows) if (r._id in byStatus) byStatus[r._id] = r.n;
    const byPayment = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const r of byPaymentRows) if (r._id in byPayment) byPayment[r._id] = r.n;

    return NextResponse.json({
      success: true,
      data: { all: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus, byPayment },
    });
  } catch (error) {
    console.error("Error computing lorry hire counts:", error);
    return fail("Error computing lorry hire counts", 500);
  }
}
