import { lrPdfPath } from "@/lib/lr-copies";
import { openStoredPdf, type PdfCacheItem } from "@/lib/pdf-url";

export { freshPdfUrl, type PdfCacheEntry } from "@/lib/pdf-url";

/** Opens an LR's PDF in a new tab — instant when a current stored copy exists (see openStoredPdf). */
export function openLrPdf(
  item: PdfCacheItem,
  opts?: { copies?: string | readonly string[]; variant?: string }
): void {
  openStoredPdf(item, {
    routePath: lrPdfPath(item._id, opts?.copies as never),
    label: "LR",
    variant: opts?.variant,
  });
}
