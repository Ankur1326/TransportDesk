import { NextRequest } from "next/server";

import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
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
 * GET /api/admin/customer/ledger/:id/statement?from&to&includeUnbilled[&download=1]
 *
 * Streams the customer's statement as a PDF rendered from /admin/statement/:id.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return pdfFail("Invalid customer id", 400);

  const range = parseStatementQuery(Object.fromEntries(request.nextUrl.searchParams));
  if (!range) return pdfFail("Invalid date range", 400);

  // Ownership check up front: no Chromium launch for ids that aren't theirs.
  await dbConnect();
  const customer = await Customer.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] })
    .select("name")
    .lean();
  if (!customer) return pdfFail("Customer not found", 404);

  return streamStatementPdf(request, {
    id,
    partyName: customer.name,
    sheetBase: "/admin/statement",
    range,
    notFoundMessage: "Customer not found",
  });
}
