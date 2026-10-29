import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { isCloudinaryConfigured, uploadPdf } from "@/lib/cloudinary";
import { renderPageToPdf } from "@/lib/lr-pdf";
import { LR_STANDARD_COPIES } from "@/lib/lr-copies";

/**
 * Stored LR PDFs, so opening an LR is a plain file open instead of a fresh
 * headless-Chromium render.
 *
 *  - One entry per variant in `consignment.pdfCache` ("default" = single page,
 *    "all" = four labelled copies, otherwise the copy keys joined with "_").
 *  - An entry is fresh while its `sourceUpdatedAt` equals the LR's `updatedAt`.
 *    Any edit / status change / POD upload bumps `updatedAt`, so the stored
 *    PDF is replaced the next time it's opened (or pre-built after save).
 *  - Cache writes use `timestamps: false` so they never bump `updatedAt`.
 *
 * Server-only. The browser-side freshness check lives in src/lib/lr-pdf-url.ts.
 */

export function pdfVariantKey(copies: readonly string[]): string {
  if (copies.length === 0) return "default";
  if (copies.length === LR_STANDARD_COPIES.length && LR_STANDARD_COPIES.every((c) => copies.includes(c))) return "all";
  return copies.join("_");
}

/** Renders the sheet, stores the PDF and records it on the LR. Returns the PDF bytes. */
export async function buildAndStoreLrPdf(opts: {
  id: string;
  companyId: string;
  variant: string;
  /** Raw `copies` query value passed to the sheet page ("" for the default variant). */
  copiesParam: string;
  baseUrl: string;
  cookieHeader: string;
}): Promise<Buffer> {
  await dbConnect();
  // Read updatedAt BEFORE rendering: if the LR changes mid-render, the stored
  // PDF is recorded as stale and simply rebuilt next time.
  const before = await ConsignmentModel.findOne({ _id: opts.id, companyId: opts.companyId })
    .select("updatedAt")
    .lean();
  const sourceUpdatedAt = before?.updatedAt ? new Date(before.updatedAt).toISOString() : "";

  const qs = opts.copiesParam ? `?copies=${encodeURIComponent(opts.copiesParam)}` : "";
  const pdf = await renderPageToPdf({
    url: `${opts.baseUrl}/admin/lr/${encodeURIComponent(opts.id)}${qs}`,
    cookieHeader: opts.cookieHeader,
  });

  if (isCloudinaryConfigured() && sourceUpdatedAt) {
    try {
      const publicId = `lr-pdf/${opts.companyId}/${opts.id}-${opts.variant}.pdf`;
      const up = await uploadPdf(pdf, { publicId });
      await ConsignmentModel.updateOne(
        { _id: opts.id, companyId: opts.companyId },
        { $set: { [`pdfCache.${opts.variant}`]: { url: up.secure_url, publicId: up.public_id, sourceUpdatedAt } } },
        { timestamps: false }
      );
    } catch (error) {
      // Storing is an optimisation — the caller still gets the PDF.
      console.error("LR PDF: couldn't store the PDF", error);
    }
  }
  return pdf;
}

/** Fire-and-forget pre-build after create / update. Never throws. */
export async function warmLrPdf(opts: {
  id: string;
  companyId: string;
  baseUrl: string;
  cookieHeader: string;
}): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(opts.id) || !isCloudinaryConfigured()) return;
    await buildAndStoreLrPdf({ ...opts, variant: "default", copiesParam: "" });
  } catch (error) {
    console.error("LR PDF: pre-build failed", error);
  }
}
