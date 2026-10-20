import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { requireCompany, companyFilter } from "@/lib/company-scope";
import { escapeRegex } from "@/lib/escape-regex";

/**
 * GET /api/admin/bills/get
 *
 * Query params (all optional):
 *  - search   free-text match against billNo, billStn, billedTo.name, items.cnsNo
 *  - page     1-indexed page number (default 1)
 *  - limit    page size (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const and: Record<string, unknown>[] = [companyFilter(auth.companyId)];
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      and.push({
        $or: [
          { billNo: regex },
          { billStn: regex },
          { "billedTo.name": regex },
          { "items.cnsNo": regex },
        ],
      });
    }
    const query = { $and: and };

    const [bills, total] = await Promise.all([
      FreightBillModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FreightBillModel.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Bills fetched successfully",
        data: bills,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while fetching bills: ", error);
    return NextResponse.json({ success: false, message: "Error fetching bills" }, { status: 500 });
  }
}