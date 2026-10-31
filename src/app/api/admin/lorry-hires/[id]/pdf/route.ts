import { NextRequest } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { fail, isObjectId } from "@/lib/lorry-hire/server";
import { LORRY_HIRE_PDF } from "@/lib/lorry-hire/pdf-cache";
import { pdfFail, safePdfName, servePdf } from "@/lib/pdf-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: Chromium cold start + render. Ignored by self-hosted Node.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/lorry-hires/:id/pdf[?download=1]
 *
 * Streams the lorry hire contract as a real PDF (rendered from
 * /admin/lorry-hire/:id in headless Chromium with the caller's session) and
 * stores it so the next open is instant. Same flow as the LR and bill routes —
 * see src/lib/pdf-route.ts.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  // Ownership check up front: no Chromium launch for ids that aren't theirs.
  await dbConnect();
  const contract = await LorryHireModel.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] })
    .select("lhcNo updatedAt pdfCache")
    .lean();
  if (!contract) return pdfFail("Lorry hire contract not found", 404);

  return servePdf(request, LORRY_HIRE_PDF, {
    id,
    companyId: auth.companyId,
    doc: contract as never,
    variant: "default",
    sheetQuery: "",
    fileName: safePdfName(contract.lhcNo, id),
  });
}
