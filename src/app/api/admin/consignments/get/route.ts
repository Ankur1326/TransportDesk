import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import "@/models/User"; // registers the model used by populate("createdBy")
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { buildConsignmentQuery, sortSpec } from "@/lib/consignment-query";
import { podDaysPending } from "@/lib/pod-status";
import { isLrStage } from "@/lib/consignment-stage";
import { idsInStage, withStages } from "@/lib/consignment-stage-server";

/**
 * GET /api/admin/consignments/get
 *
 * Query params (all optional):
 *  - search          LR no, vehicle, e-way bill, consignor/consignee, from/to city
 *  - status          Booked | On Route | Delivered | Cancelled
 *  - paymentStatus   Pending | Partially Paid | Paid | Cancelled
 *  - podStatus       Pending | Received | Submitted (legacy LRs count as Pending)
 *  - from, to        booking-date range, YYYY-MM-DD, inclusive
 *  - fromCity, toCity, consignor, consignee, vehicle   "contains" filters
 *  - segment, partyType + partyName
 *  - excludeBilled   "true" to hide LRs already on a freight bill
 *  - sort            newest (default) | oldest | booking_newest | booking_oldest | delivered_oldest
 *  - stage           Booked | On Route | Delivered | POD Received | Billed | Partially Paid | Paid | Cancelled
 *
 * Every item also carries `podDaysPending`: whole days since delivery for a
 * Delivered LR still waiting for its POD, otherwise null.
 *  - page            1-indexed (default 1)
 *  - limit           page size (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const { query } = buildConsignmentQuery(searchParams, auth.companyId);

    // Optionally hide consignments that already appear on a freight bill.
    if (searchParams.get("excludeBilled") === "true") {
      const Bill = (await import("@/models/Bill")).default;
      const billedIds = await Bill.distinct("items.consignmentId", companyFilter(auth.companyId));
      if (billedIds.length) (query.$and as unknown[]).push({ _id: { $nin: billedIds } });
    }

    // Trip-stage filter: stages depend on the bill, so resolve the matching ids first.
    const stage = searchParams.get("stage")?.trim();
    if (stage && isLrStage(stage)) {
      const ids = await idsInStage(auth.companyId, query, stage);
      (query.$and as unknown[]).push({ _id: { $in: ids } });
    }

    const [consignments, total] = await Promise.all([
      ConsignmentModel.find(query)
        .sort(sortSpec(searchParams.get("sort")))
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "createdBy", select: "fullName" })
        .lean(),
      ConsignmentModel.countDocuments(query),
    ]);

    // The list UI reads `createdBy.name`.
    const staged = await withStages(auth.companyId, consignments);
    const now = new Date();
    const data = staged.map((c) => {
      const by = c.createdBy as unknown as { fullName?: string } | null | undefined;
      const row = by && typeof by === "object" ? { ...c, createdBy: { name: by.fullName ?? "" } } : c;
      return { ...row, podDaysPending: podDaysPending(c, now) };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Consignments fetched successfully",
        data,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching consignments:", error);
    return NextResponse.json({ success: false, message: "Error fetching consignments" }, { status: 500 });
  }
}
