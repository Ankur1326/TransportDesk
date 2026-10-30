import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { isObjectId } from "@/lib/ledger/load-ledger";
import { parseStatementQuery } from "@/lib/ledger/statement-query";
import { ChromiumUnavailableError, renderPageToPdf, SheetLoadError } from "@/lib/lr-pdf";
import { pdfRenderBaseUrl } from "@/lib/pdf-cache";
import { pdfFail, safePdfName } from "@/lib/pdf-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: Chromium cold start + render. Ignored by self-hosted Node.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/customer/ledger/:id/statement?from&to&includeUnbilled[&download=1]
 *
 * Streams the customer's statement as a PDF rendered from
 * /admin/statement/:id in headless Chromium with the caller's session.
 * Unlike bills and LRs the PDF is NOT stored: a statement depends on many
 * documents (bills, payments, bilties) plus the date range, so there is no
 * single `updatedAt` to key a stored copy on, and a stale statement is worse
 * than a slow one.
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

  const download = request.nextUrl.searchParams.get("download") === "1";
  const sheetQuery = new URLSearchParams({ includeUnbilled: String(range.includeUnbilled) });
  if (range.from) sheetQuery.set("from", range.from);
  if (range.to) sheetQuery.set("to", range.to);
  const sheetPath = `/admin/statement/${encodeURIComponent(id)}`;

  try {
    const pdf = await renderPageToPdf({
      url: `${pdfRenderBaseUrl(request.nextUrl.origin)}${sheetPath}?${sheetQuery.toString()}`,
      cookieHeader: request.headers.get("cookie") ?? "",
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Statement-${safePdfName(customer.name, id)}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ChromiumUnavailableError) {
      console.error("Statement PDF: Chromium unavailable, using the HTML sheet instead.", error.cause);
      sheetQuery.set("toolbar", "1");
      return NextResponse.redirect(new URL(`${sheetPath}?${sheetQuery.toString()}`, request.url));
    }
    if (error instanceof SheetLoadError) {
      return pdfFail(error.status === 404 ? "Customer not found" : "The statement could not be rendered.", error.status === 404 ? 404 : 502);
    }
    console.error("Statement PDF: render failed", error);
    return pdfFail("Couldn't generate the PDF. Please try again.", 500);
  }
}
