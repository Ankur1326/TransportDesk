import ConsignmentModel from "@/models/Consignment";
import { LR_STANDARD_COPIES } from "@/lib/lr-copies";
import { buildAndStorePdf, warmPdf, type BuildPdfOptions, type PdfKind } from "@/lib/pdf-cache";

/**
 * Stored LR PDFs (see src/lib/pdf-cache.ts for how freshness works), so opening
 * an LR is a plain file open instead of a fresh headless-Chromium render.
 *
 * Variants: "default" = single page, "all" = four labelled copies, otherwise
 * the copy keys joined with "_".
 */
export const LR_PDF: PdfKind = {
  label: "LR",
  model: ConsignmentModel,
  folder: "lr-pdf",
  sheetPath: (id) => `/admin/lr/${encodeURIComponent(id)}`,
};

export function pdfVariantKey(copies: readonly string[]): string {
  if (copies.length === 0) return "default";
  if (copies.length === LR_STANDARD_COPIES.length && LR_STANDARD_COPIES.every((c) => copies.includes(c))) return "all";
  return copies.join("_");
}

/** `copiesParam` is the raw `copies` query value ("" for the default variant). */
export function buildAndStoreLrPdf(opts: Omit<BuildPdfOptions, "sheetQuery"> & { copiesParam: string }): Promise<Buffer> {
  const { copiesParam, ...rest } = opts;
  return buildAndStorePdf(LR_PDF, {
    ...rest,
    sheetQuery: copiesParam ? `copies=${encodeURIComponent(copiesParam)}` : "",
  });
}

export const warmLrPdf = (opts: Parameters<typeof warmPdf>[1]) => warmPdf(LR_PDF, opts);
