import { NextResponse, type NextRequest } from "next/server";

import { ChromiumUnavailableError, SheetLoadError } from "@/lib/lr-pdf";
import { buildAndStorePdf, pdfRenderBaseUrl, type PdfKind } from "@/lib/pdf-cache";
import { freshPdfUrl, type PdfCacheEntry } from "@/lib/pdf-url";

export const pdfFail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

/** `LR-123/45` -> `LR-123_45` — safe inside a Content-Disposition filename. */
export const safePdfName = (value: unknown, fallback: string) =>
  String(value ?? fallback).replace(/[^\w.-]+/g, "_");

/**
 * The shared tail of every `/api/admin/.../:id/pdf` route. The caller has
 * already checked auth, the id and ownership (loading `updatedAt` + `pdfCache`);
 * this part serves the stored PDF if it's current, otherwise renders it once,
 * stores it and streams it.
 *
 * `download=1` sends an attachment instead of opening inline. If Chromium
 * can't start, redirects to the HTML sheet with a Print button instead.
 */
export async function servePdf(
  request: NextRequest,
  kind: PdfKind,
  opts: {
    id: string;
    companyId: string;
    doc: { updatedAt?: unknown; pdfCache?: Record<string, PdfCacheEntry> | null };
    variant: string;
    /** Query string for the sheet page, without "?" ("" for none). */
    sheetQuery: string;
    /** Download file name without ".pdf". */
    fileName: string;
  }
): Promise<NextResponse> {
  const download = request.nextUrl.searchParams.get("download") === "1";

  // Already built and still current: send the browser straight to the stored file.
  if (!download) {
    const stored = freshPdfUrl(opts.doc as never, opts.variant);
    if (stored) return NextResponse.redirect(stored, 302);
  }

  try {
    // Renders once, stores the PDF and records it, so the next open is instant.
    const pdf = await buildAndStorePdf(kind, {
      id: opts.id,
      companyId: opts.companyId,
      variant: opts.variant,
      sheetQuery: opts.sheetQuery,
      baseUrl: pdfRenderBaseUrl(request.nextUrl.origin),
      cookieHeader: request.headers.get("cookie") ?? "",
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${opts.fileName}.pdf"`,
        "Content-Length": String(pdf.length),
        // Private + uncached: the document changes when it is edited, and the
        // URL is only valid for the signed-in company.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ChromiumUnavailableError) {
      console.error(`${kind.label} PDF: Chromium unavailable, using the HTML sheet instead.`, error.cause);
      const query = [opts.sheetQuery, "toolbar=1"].filter(Boolean).join("&");
      return NextResponse.redirect(new URL(`${kind.sheetPath(opts.id)}?${query}`, request.url));
    }
    if (error instanceof SheetLoadError) {
      return pdfFail(error.message, error.status === 404 ? 404 : 502);
    }
    console.error(`${kind.label} PDF: render failed`, error);
    return pdfFail("Couldn't generate the PDF. Please try again.", 500);
  }
}
