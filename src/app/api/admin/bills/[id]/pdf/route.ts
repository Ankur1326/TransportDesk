import { NextRequest } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import FreightBillModel from "@/models/Bill";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { BILL_PDF } from "@/lib/bill-pdf-cache";
import { pdfFail, safePdfName, servePdf } from "@/lib/pdf-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: Chromium cold start + render. Ignored by self-hosted Node.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/bills/:id/pdf[?download=1]
 *
 * Streams the freight bill as a real PDF (rendered from /admin/bill/:id in
 * headless Chromium with the caller's session) and stores it so the next open
 * is instant. Same flow as the LR route — see src/lib/pdf-route.ts.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return pdfFail("Invalid bill id", 400);

  // Ownership check up front: no Chromium launch for ids that aren't theirs.
  await dbConnect();
  const bill = await FreightBillModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
    .select("billNo updatedAt pdfCache")
    .lean();
  if (!bill) return pdfFail("Bill not found", 404);

  return servePdf(request, BILL_PDF, {
    id,
    companyId: auth.companyId,
    doc: bill as never,
    variant: "default",
    sheetQuery: "",
    fileName: `Bill-${safePdfName(bill.billNo, id)}`,
  });
}
