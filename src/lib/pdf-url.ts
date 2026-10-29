/** Browser-safe (no server imports). Shared by every stored-PDF document (LR, bill, ...). */
export type PdfCacheEntry = { url: string; publicId?: string; sourceUpdatedAt: string };

export type DateLike = string | Date | { $date: string } | null | undefined;
const toMs = (d: DateLike) => new Date(d && typeof d === "object" && "$date" in d ? d.$date : (d as string | Date)).getTime();

/** Anything that can carry a stored PDF: needs its latest edit time and the cache map. */
export type PdfCacheItem = { _id: string; updatedAt?: DateLike; pdfCache?: Record<string, PdfCacheEntry> | null };

/** The stored PDF URL for a variant, only if it still matches the document's latest edit. */
export function freshPdfUrl(item: Omit<PdfCacheItem, "_id">, variant = "default"): string | null {
  const entry = item.pdfCache?.[variant];
  if (!entry?.url || !item.updatedAt) return null;
  return toMs(entry.sourceUpdatedAt) === toMs(item.updatedAt) ? entry.url : null;
}

const placeholder = (label: string) => `<!doctype html><meta charset="utf-8"><title>Opening ${label}…</title>
<style>html,body{height:100%;margin:0;background:#323639;color:#e5e7eb;font:15px system-ui,sans-serif;display:grid;place-items:center}
.s{width:30px;height:30px;border:3px solid #6b7280;border-top-color:#fff;border-radius:50%;animation:r .8s linear infinite;margin:0 auto 12px}
@keyframes r{to{transform:rotate(360deg)}}</style>
<div style="text-align:center"><div class="s"></div>Preparing your ${label}…</div>`;

/**
 * Opens a document's PDF in a new tab.
 *  - Stored PDF is current  -> opens that file directly (instant, no server work).
 *  - Otherwise              -> opens the tab immediately with a spinner (so the
 *    popup blocker is satisfied), then points it at `routePath`, which builds
 *    and stores the PDF once; later opens are instant.
 */
export function openStoredPdf(
  item: PdfCacheItem,
  opts: { routePath: string; label: string; variant?: string }
): void {
  const stored = freshPdfUrl(item, opts.variant ?? "default");
  if (stored) {
    window.open(stored, "_blank", "noopener");
    return;
  }
  const tab = window.open("", "_blank");
  if (!tab) return;
  try {
    tab.document.write(placeholder(opts.label));
    tab.document.close();
  } catch { /* cross-origin edge case: just navigate */ }
  tab.location.href = opts.routePath;
}
