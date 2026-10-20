import { NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { requireCompany, companyFilter } from "@/lib/company-scope";

/**
 * One-time seed so numbering continues from your last physical bill (101/26-27)
 * instead of restarting at 01 the first time this collection is empty for a
 * given fiscal year. Once the DB has at least one real bill for a year, this
 * fallback is never consulted again for that year — the real max takes over.
 */
const FALLBACK_SEED_SEQ_BY_LABEL: Record<string, number> = {
  "26-27": 100,
};

function currentFiscalYearLabel(date: Date = new Date()): string {
  const year = date.getFullYear();
  const isBeforeApril = date.getMonth() < 3; // Jan(0)-Mar(2) still belongs to the FY that started last April
  const startYear = isBeforeApril ? year - 1 : year;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

export async function GET() {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const label = currentFiscalYearLabel();

    // billNo format is "<seq>/<label>" — match bills already in this fiscal year.
    const latest = await FreightBillModel.find({ billNo: new RegExp(`/${label}$`), ...companyFilter(auth.companyId) })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    let nextSeq: number;
    if (latest.length > 0) {
      const match = latest[0].billNo.match(/^(\d+)\//);
      nextSeq = match ? parseInt(match[1], 10) + 1 : 1;
    } else {
      nextSeq = (FALLBACK_SEED_SEQ_BY_LABEL[label] ?? 0) + 1;
    }

    const billNo = `${String(nextSeq).padStart(2, "0")}/${label}`;

    return NextResponse.json(
      { success: true, message: "Next bill number computed", data: { billNo } },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error computing next bill number: ", error);
    return NextResponse.json({ success: false, message: "Error computing next bill number" }, { status: 500 });
  }
}