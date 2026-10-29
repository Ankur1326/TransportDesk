import { NextRequest } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { parseCopies } from "@/lib/lr-copies";
import { LR_PDF, pdfVariantKey } from "@/lib/lr-pdf-cache";
import { pdfFail, safePdfName, servePdf } from "@/lib/pdf-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: Chromium cold start + render. Ignored by self-hosted Node.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/consignments/:id/pdf[?copies=lorry,consignee,consignor,file|all][&download=1]
 *
 * Streams the LR as a real PDF so the browser's own viewer opens it — no app
 * shell, no hydration. The PDF is produced by loading the bare sheet page
 * (/admin/lr/:id) in headless Chromium with the caller's session, then stored
 * so the next open is instant (see src/lib/pdf-route.ts for the shared part).
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return pdfFail("Invalid consignment id", 400);

  const copiesParam = request.nextUrl.searchParams.get("copies");
  const parsed = parseCopies(copiesParam);
  if (!parsed.ok) return pdfFail(parsed.message, 400);

  // Ownership check up front: no Chromium launch for ids that aren't theirs.
  await dbConnect();
  const lr = await ConsignmentModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
    .select("consignmentNumber updatedAt pdfCache")
    .lean();
  if (!lr) return pdfFail("Consignment not found", 404);

  const suffix =
    parsed.copies.length === 1 ? `-${parsed.copies[0]}` : parsed.copies.length > 1 ? "-all-copies" : "";

  return servePdf(request, LR_PDF, {
    id,
    companyId: auth.companyId,
    doc: lr as never,
    variant: pdfVariantKey(parsed.copies),
    sheetQuery: copiesParam ? `copies=${encodeURIComponent(copiesParam)}` : "",
    fileName: `LR-${safePdfName(lr.consignmentNumber, id)}${suffix}`,
  });
}
