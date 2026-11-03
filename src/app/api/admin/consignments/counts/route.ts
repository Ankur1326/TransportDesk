import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { requireCompany } from "@/lib/company-scope";
import { buildConsignmentQuery } from "@/lib/consignment-query";
import { stageEveryLr } from "@/lib/consignment-stage-server";
import { isLrStage, tallyStages } from "@/lib/consignment-stage";
import { DEFAULT_LR_STATUS, LR_STATUSES, isLrStatus, type LrStatus } from "@/lib/consignment-status";
import { pendingPodMatch } from "@/lib/pod-status";

/**
 * GET /api/admin/consignments/counts
 *
 * Accepts the same filters as /get (except `status`, which is ignored) and
 * returns the number of matching LRs per status for the tab badges:
 *   { All: 12, Booked: 5, "On Route": 3, Delivered: 3, Cancelled: 1, pendingPod: 2,
 *     stages: { Booked: 5, ..., "POD Received": 1, Billed: 1, "Partially Paid": 0, Paid: 2, Cancelled: 1 } }
 * `pendingPod` = Delivered LRs whose POD is still Pending (legacy LRs included).
 *
 * `stages` is the trip-stage split (see src/lib/consignment-stage.ts); it follows the
 * same filters, so the stage dropdown can show counts too.
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const { queryWithoutStatus } = buildConsignmentQuery(searchParams, auth.companyId);

    // Stage totals ignore the stage filter (so the dropdown can show every option's count);
    // the status-tab totals below do respect it.
    const staged = await stageEveryLr(auth.companyId, queryWithoutStatus);
    const stages = tallyStages(staged);

    const stageFilter = searchParams.get("stage")?.trim();
    const statusMatch =
      stageFilter && isLrStage(stageFilter)
        ? {
            $and: [
              queryWithoutStatus,
              { _id: { $in: staged.filter((r) => r.stage === stageFilter).map((r) => new mongoose.Types.ObjectId(r.id)) } },
            ],
          }
        : queryWithoutStatus;

    const [rows, pendingPod] = await Promise.all([
      ConsignmentModel.aggregate<{ _id: string | null; count: number }>([
        { $match: statusMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ConsignmentModel.countDocuments({ $and: [statusMatch, pendingPodMatch()] }),
    ]);

    const counts = Object.fromEntries(LR_STATUSES.map((s) => [s, 0])) as Record<LrStatus, number>;
    let all = 0;
    for (const row of rows) {
      const key: LrStatus = isLrStatus(row._id) ? row._id : DEFAULT_LR_STATUS;
      counts[key] += row.count;
      all += row.count;
    }

    return NextResponse.json({ success: true, data: { All: all, ...counts, pendingPod, stages } }, { status: 200 });
  } catch (error) {
    console.error("Error while counting consignments:", error);
    return NextResponse.json({ success: false, message: "Error counting consignments" }, { status: 500 });
  }
}
