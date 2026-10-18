import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { requireCompany } from "@/lib/company-scope";
import { buildConsignmentQuery } from "@/lib/consignment-query";
import { DEFAULT_LR_STATUS, LR_STATUSES, isLrStatus, type LrStatus } from "@/lib/consignment-status";

/**
 * GET /api/admin/consignments/counts
 *
 * Accepts the same filters as /get (except `status`, which is ignored) and
 * returns the number of matching LRs per status for the tab badges:
 *   { All: 12, Booked: 5, "On Route": 3, Delivered: 3, Cancelled: 1 }
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const { queryWithoutStatus } = buildConsignmentQuery(searchParams, auth.companyId);

    const rows = await ConsignmentModel.aggregate<{ _id: string | null; count: number }>([
      { $match: queryWithoutStatus },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const counts = Object.fromEntries(LR_STATUSES.map((s) => [s, 0])) as Record<LrStatus, number>;
    let all = 0;
    for (const row of rows) {
      const key: LrStatus = isLrStatus(row._id) ? row._id : DEFAULT_LR_STATUS;
      counts[key] += row.count;
      all += row.count;
    }

    return NextResponse.json({ success: true, data: { All: all, ...counts } }, { status: 200 });
  } catch (error) {
    console.error("Error while counting consignments:", error);
    return NextResponse.json({ success: false, message: "Error counting consignments" }, { status: 500 });
  }
}
