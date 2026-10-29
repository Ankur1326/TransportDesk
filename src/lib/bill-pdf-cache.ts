import FreightBillModel from "@/models/Bill";
import { warmPdf, type PdfKind } from "@/lib/pdf-cache";

/**
 * Stored freight-bill PDFs (see src/lib/pdf-cache.ts). A bill has a single
 * printable layout, so only the "default" variant is ever stored.
 */
export const BILL_PDF: PdfKind = {
  label: "Bill",
  model: FreightBillModel,
  folder: "bill-pdf",
  sheetPath: (id) => `/admin/bill/${encodeURIComponent(id)}`,
};

export const warmBillPdf = (opts: Parameters<typeof warmPdf>[1]) => warmPdf(BILL_PDF, opts);
