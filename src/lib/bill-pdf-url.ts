import { openStoredPdf, type PdfCacheItem } from "@/lib/pdf-url";

/** Relative URL of a freight bill's PDF, e.g. `/api/admin/bills/<id>/pdf`. */
export const billPdfPath = (id: string, opts?: { download?: boolean }) =>
  `/api/admin/bills/${encodeURIComponent(id)}/pdf${opts?.download ? "?download=1" : ""}`;

/** Opens a bill's PDF in a new tab — instant when a current stored copy exists (see openStoredPdf). */
export const openBillPdf = (bill: PdfCacheItem) =>
  openStoredPdf(bill, { routePath: billPdfPath(bill._id), label: "bill" });
