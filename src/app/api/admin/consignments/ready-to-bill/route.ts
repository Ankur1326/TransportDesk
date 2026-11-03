import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { requireCompany } from "@/lib/company-scope";
import { buildConsignmentQuery } from "@/lib/consignment-query";
import { billedConsignmentIds } from "@/lib/bill/billed-consignments";
import { groupByBillingParty } from "@/lib/ready-to-bill";
import { podClearedMatch } from "@/lib/pod-status";

/** Upper bound on LRs returned; `truncated` tells the UI when there are more. */
const MAX_ROWS = 1000;

/**
 * GET /api/admin/consignments/ready-to-bill
 *
 * LRs that are Delivered, have their POD Received/Submitted, aren't cancelled
 * and aren't on a bill, grouped by billing party (longest-waiting first).
 * Accepts the same optional filters as /get (search, consignor, consignee,
 * vehicle, from/to, …); `status` and `podStatus` are fixed by this endpoint.
 *
 *   { success, data: { groups: [{ key, partyName, kind, unassigned, items }], total, truncated } }
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    // Ignore any status / podStatus the caller sent — they would fight the fixed rules below.
    searchParams.delete("status");
    searchParams.delete("podStatus");
    const { query } = buildConsignmentQuery(searchParams, auth.companyId);

    const billed = await billedConsignmentIds(auth.companyId);
    const and = query.$and as unknown[];
    and.push({ status: "Delivered" }, podClearedMatch());
    if (billed.length) and.push({ _id: { $nin: billed } });

    const rows = await ConsignmentModel.find(query)
      .select(
        "consignmentNumber bookingDate deliveredAt vehicleNumber from.location to.location consignor.name consignee.name " +
          "payment charges tax status podStatus podReceivedAt podSubmittedAt"
      )
      .sort({ deliveredAt: 1, createdAt: 1 })
      .limit(MAX_ROWS + 1)
      .lean();

    const truncated = rows.length > MAX_ROWS;
    const items = truncated ? rows.slice(0, MAX_ROWS) : rows;

    return NextResponse.json(
      { success: true, data: { groups: groupByBillingParty(items), total: items.length, truncated } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while loading ready-to-bill LRs:", error);
    return NextResponse.json({ success: false, message: "Error loading LRs ready to bill" }, { status: 500 });
  }
}
