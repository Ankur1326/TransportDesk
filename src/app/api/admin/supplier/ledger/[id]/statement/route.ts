import { NextRequest } from "next/server";

import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { isObjectId } from "@/lib/ledger/load-ledger";
import { parseStatementQuery } from "@/lib/ledger/statement-query";
import { streamStatementPdf } from "@/lib/ledger/statement-pdf";
import { pdfFail } from "@/lib/pdf-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: Chromium cold start + render. Ignored by self-hosted Node.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/supplier/ledger/:id/statement?from&to[&download=1]
 *
 * Streams the supplier's statement as a PDF rendered from /admin/supplier-statement/:id.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return pdfFail("Invalid supplier id", 400);

  const range = parseStatementQuery(Object.fromEntries(request.nextUrl.searchParams));
  if (!range) return pdfFail("Invalid date range", 400);

  await dbConnect();
  const supplier = await Supplier.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] })
    .select("name")
    .lean();
  if (!supplier) return pdfFail("Supplier not found", 404);

  return streamStatementPdf(request, {
    id,
    partyName: supplier.name,
    sheetBase: "/admin/supplier-statement",
    range,
    notFoundMessage: "Supplier not found",
  });
}
