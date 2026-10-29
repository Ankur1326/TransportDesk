import mongoose, { type Model } from "mongoose";

import dbConnect from "@/lib/db";
import { isCloudinaryConfigured, uploadPdf } from "@/lib/cloudinary";
import { renderPageToPdf } from "@/lib/lr-pdf";

/**
 * Shared "store the rendered PDF" logic for every printable document (LR,
 * freight bill, ...). Server-only. The browser-side freshness check lives in
 * src/lib/pdf-url.ts.
 *
 *  - One entry per variant in the document's `pdfCache` field.
 *  - An entry is fresh while its `sourceUpdatedAt` equals the document's
 *    `updatedAt`, so any edit makes the stored PDF stale and it is replaced the
 *    next time it's opened (or pre-built after save).
 *  - Cache writes use `timestamps: false` so they never bump `updatedAt`.
 *
 * Each document type describes itself with a PdfKind (see lr-pdf-cache.ts and
 * bill-pdf-cache.ts) and gets build / warm / route behaviour from here.
 */
export interface PdfKind {
  /** Used in log lines and error messages, e.g. "LR", "Bill". */
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  /** Cloudinary folder, e.g. "lr-pdf". */
  folder: string;
  /** Bare, server-rendered sheet page that headless Chromium prints. */
  sheetPath: (id: string) => string;
}

export interface BuildPdfOptions {
  id: string;
  companyId: string;
  variant: string;
  /** Raw query string value(s) for the sheet page, without "?" ("" for none). */
  sheetQuery: string;
  baseUrl: string;
  cookieHeader: string;
}

/** Renders the sheet, stores the PDF and records it on the document. Returns the PDF bytes. */
export async function buildAndStorePdf(kind: PdfKind, opts: BuildPdfOptions): Promise<Buffer> {
  await dbConnect();
  // Read updatedAt BEFORE rendering: if the document changes mid-render, the
  // stored PDF is recorded as stale and simply rebuilt next time.
  const before = await kind.model
    .findOne({ _id: opts.id, companyId: opts.companyId })
    .select("updatedAt")
    .lean<{ updatedAt?: Date }>();
  const sourceUpdatedAt = before?.updatedAt ? new Date(before.updatedAt).toISOString() : "";

  const qs = opts.sheetQuery ? `?${opts.sheetQuery}` : "";
  const pdf = await renderPageToPdf({
    url: `${opts.baseUrl}${kind.sheetPath(opts.id)}${qs}`,
    cookieHeader: opts.cookieHeader,
  });

  if (isCloudinaryConfigured() && sourceUpdatedAt) {
    try {
      const publicId = `${kind.folder}/${opts.companyId}/${opts.id}-${opts.variant}.pdf`;
      const up = await uploadPdf(pdf, { publicId });
      await kind.model.updateOne(
        { _id: opts.id, companyId: opts.companyId },
        { $set: { [`pdfCache.${opts.variant}`]: { url: up.secure_url, publicId: up.public_id, sourceUpdatedAt } } },
        { timestamps: false }
      );
    } catch (error) {
      // Storing is an optimisation — the caller still gets the PDF.
      console.error(`${kind.label} PDF: couldn't store the PDF`, error);
    }
  }
  return pdf;
}

/** Fire-and-forget pre-build of the default variant after create / update. Never throws. */
export async function warmPdf(
  kind: PdfKind,
  opts: Pick<BuildPdfOptions, "id" | "companyId" | "baseUrl" | "cookieHeader">
): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(opts.id) || !isCloudinaryConfigured()) return;
    await buildAndStorePdf(kind, { ...opts, variant: "default", sheetQuery: "" });
  } catch (error) {
    console.error(`${kind.label} PDF: pre-build failed`, error);
  }
}

/** Where headless Chromium should load the sheet from (see PDF_RENDER_BASE_URL). */
export function pdfRenderBaseUrl(origin: string): string {
  return (process.env.PDF_RENDER_BASE_URL || origin).replace(/\/$/, "");
}
