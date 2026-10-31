import LorryHireModel from "@/models/LorryHire";
import { warmPdf, type PdfKind } from "@/lib/pdf-cache";

/**
 * Stored lorry-hire contract PDFs (see src/lib/pdf-cache.ts). A contract has a
 * single printable layout, so only the "default" variant is ever stored.
 * Server-only.
 */
export const LORRY_HIRE_PDF: PdfKind = {
  label: "Lorry hire contract",
  model: LorryHireModel,
  folder: "lorry-hire-pdf",
  sheetPath: (id) => `/admin/lorry-hire/${encodeURIComponent(id)}`,
};

export const warmLorryHirePdf = (opts: Parameters<typeof warmPdf>[1]) => warmPdf(LORRY_HIRE_PDF, opts);
