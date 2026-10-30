import { NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import CompanySettings from "@/models/CompanySettings";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { fail } from "@/lib/lorry-hire/server";
import { LHC_NUMBER_MONGO_REGEX, formatLhcNo, nextLhcSequence } from "@/lib/lorry-hire/number";

/**
 * Next plain LHC number ("LHC/1624"): one above the highest used (cancelled
 * contracts keep their number), never below the company's configured start.
 * Two people can still get the same suggestion; the unique index makes the
 * second save fail with a clear "already exists" message.
 */
export async function GET() {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const [agg, settings] = await Promise.all([
      LorryHireModel.aggregate<{ max: number }>([
        { $match: { $and: [companyFilter(auth.companyId), { lhcNo: { $regex: LHC_NUMBER_MONGO_REGEX, $options: "i" } }] } },
        { $project: { seq: { $toLong: { $substrCP: ["$lhcNo", 4, 20] } } } },
        { $group: { _id: null, max: { $max: "$seq" } } },
      ]),
      CompanySettings.findOne({ ownerId: auth.companyId }).select("lorryHireStartNumber").lean() as Promise<{
        lorryHireStartNumber?: number;
      } | null>,
    ]);

    const lhcNo = formatLhcNo(nextLhcSequence(agg[0]?.max, settings?.lorryHireStartNumber ?? 1));
    return NextResponse.json({ success: true, message: "Next LHC number computed", data: { lhcNo } });
  } catch (error) {
    console.error("Error computing next LHC number:", error);
    return fail("Error computing next LHC number", 500);
  }
}
