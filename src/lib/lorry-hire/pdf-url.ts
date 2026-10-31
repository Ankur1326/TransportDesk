import { openStoredPdf, type PdfCacheItem } from "@/lib/pdf-url";

/** Relative URL of a contract's PDF, e.g. `/api/admin/lorry-hires/<id>/pdf`. Browser-safe. */
export const lorryHirePdfPath = (id: string, opts?: { download?: boolean }) =>
  `/api/admin/lorry-hires/${encodeURIComponent(id)}/pdf${opts?.download ? "?download=1" : ""}`;

/** Opens a contract's PDF in a new tab — instant when a current stored copy exists (see openStoredPdf). */
export const openLorryHirePdf = (contract: PdfCacheItem) =>
  openStoredPdf(contract, { routePath: lorryHirePdfPath(contract._id), label: "contract" });

const placeholder = `<!doctype html><meta charset="utf-8"><title>Preparing contract…</title>
<style>html,body{height:100%;margin:0;background:#323639;color:#e5e7eb;font:15px system-ui,sans-serif;display:grid;place-items:center}
.s{width:30px;height:30px;border:3px solid #6b7280;border-top-color:#fff;border-radius:50%;animation:r .8s linear infinite;margin:0 auto 12px}
@keyframes r{to{transform:rotate(360deg)}}</style>
<div style="text-align:center"><div class="s"></div>Preparing your contract…</div>`;

/**
 * Opens an empty "preparing" tab right now (inside the click, so the popup
 * blocker allows it) for a PDF that only exists after an async save. Point it
 * at `lorryHirePdfPath(id)` once saved, or `.close()` it if the save fails.
 */
export function openPdfTab(): Window | null {
  const tab = window.open("", "_blank");
  if (!tab) return null;
  try {
    tab.document.write(placeholder);
    tab.document.close();
  } catch {
    /* cross-origin edge case: it will just navigate */
  }
  return tab;
}
