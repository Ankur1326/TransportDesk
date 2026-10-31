import { NextRequest, NextResponse } from "next/server";
import { ChromiumUnavailableError, renderPageToPdf, SheetLoadError } from "@/lib/lr-pdf";
import { pdfRenderBaseUrl } from "@/lib/pdf-cache";
import { pdfFail, safePdfName } from "@/lib/pdf-route";
import type { StatementQuery } from "@/lib/ledger/statement-query";

/**
 * Renders a party's statement sheet in headless Chromium (with the caller's
 * session) and streams the PDF. Shared by the customer and supplier routes.
 *
 * The PDF is NOT stored: a statement depends on many documents plus the date
 * range, so there is no single `updatedAt` to key a stored copy on, and a
 * stale statement is worse than a slow one.
 *
 * Callers must already have authenticated the request and confirmed the party
 * belongs to the signed-in company.
 */
export async function streamStatementPdf(
  request: NextRequest,
  opts: {
    id: string;
    partyName: string;
    /** Print page, e.g. "/admin/statement". The party id is appended. */
    sheetBase: string;
    range: StatementQuery;
    notFoundMessage: string;
  }
): Promise<Response> {
  const { id, range } = opts;
  const download = request.nextUrl.searchParams.get("download") === "1";
  const sheetQuery = new URLSearchParams({ includeUnbilled: String(range.includeUnbilled) });
  if (range.from) sheetQuery.set("from", range.from);
  if (range.to) sheetQuery.set("to", range.to);
  const sheetPath = `${opts.sheetBase}/${encodeURIComponent(id)}`;

  try {
    const pdf = await renderPageToPdf({
      url: `${pdfRenderBaseUrl(request.nextUrl.origin)}${sheetPath}?${sheetQuery.toString()}`,
      cookieHeader: request.headers.get("cookie") ?? "",
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Statement-${safePdfName(opts.partyName, id)}.pdf"`,
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
      return error.status === 404
        ? pdfFail(opts.notFoundMessage, 404)
        : pdfFail("The statement could not be rendered.", 502);
    }
    console.error("Statement PDF: render failed", error);
    return pdfFail("Couldn't generate the PDF. Please try again.", 500);
  }
}
