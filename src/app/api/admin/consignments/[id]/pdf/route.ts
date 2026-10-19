import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { parseCopies } from "@/lib/lr-copies";
import { ChromiumUnavailableError, renderPageToPdf, SheetLoadError } from "@/lib/lr-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: Chromium cold start + render. Ignored by self-hosted Node.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

/**
 * GET /api/admin/consignments/:id/pdf[?copies=lorry,consignee,consignor,file|all][&download=1]
 *
 * `download=1` sends the PDF as an attachment (file download) instead of
 * opening it inline in the browser's viewer.
 *
 * Streams the LR as a real PDF so the browser's own viewer opens it — no app
 * shell, no hydration. The PDF is produced by loading the bare sheet page
 * (/admin/lr/:id) in headless Chromium with the caller's session.
 *
 * If Chromium can't start on this host, redirects to that sheet page with a
 * Print button instead (the fallback from the Phase 3 plan).
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid consignment id", 400);

  const copiesParam = request.nextUrl.searchParams.get("copies");
  const parsed = parseCopies(copiesParam);
  if (!parsed.ok) return fail(parsed.message, 400);

  // Ownership check up front: no Chromium launch for ids that aren't theirs.
  await dbConnect();
  const lr = await ConsignmentModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
    .select("consignmentNumber")
    .lean();
  if (!lr) return fail("Consignment not found", 404);

  const base = (process.env.PDF_RENDER_BASE_URL || request.nextUrl.origin).replace(/\/$/, "");
  const sheetPath = `/admin/lr/${encodeURIComponent(id)}`;
  const qs = copiesParam ? `?copies=${encodeURIComponent(copiesParam)}` : "";

  try {
    const pdf = await renderPageToPdf({
      url: `${base}${sheetPath}${qs}`,
      cookieHeader: request.headers.get("cookie") ?? "",
    });

    const safeName = String(lr.consignmentNumber ?? id).replace(/[^\w.-]+/g, "_");
    const suffix =
      parsed.copies.length === 1 ? `-${parsed.copies[0]}` : parsed.copies.length > 1 ? "-all-copies" : "";
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="LR-${safeName}${suffix}.pdf"`,
        "Content-Length": String(pdf.length),
        // Private + uncached: the LR changes when it is edited, and the URL
        // is only valid for the signed-in company.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ChromiumUnavailableError) {
      console.error("LR PDF: Chromium unavailable, using the HTML sheet instead.", error.cause);
      const joiner = qs ? "&" : "?";
      return NextResponse.redirect(new URL(`${sheetPath}${qs}${joiner}toolbar=1`, request.url));
    }
    if (error instanceof SheetLoadError) {
      return fail(error.message, error.status === 404 ? 404 : 502);
    }
    console.error("LR PDF: render failed", error);
    return fail("Couldn't generate the PDF. Please try again.", 500);
  }
}
