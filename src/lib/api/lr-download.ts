import { lrPdfPath, type LrCopyKey } from "@/lib/lr-copies";

/**
 * Downloads an LR PDF as a file. Resolves once the browser has been handed
 * the file; throws an Error with a readable message otherwise.
 *
 * If the server couldn't run Chromium it redirects to the printable HTML
 * sheet — in that case the sheet is opened in a new tab instead, where the
 * user can use Print / Save as PDF.
 */
export async function downloadLrPdf(id: string, copies?: string | readonly LrCopyKey[]): Promise<void> {
  const res = await fetch(lrPdfPath(id, copies, { download: true }), { credentials: "same-origin" });

  const type = res.headers.get("content-type") ?? "";
  if (res.ok && !type.includes("application/pdf")) {
    window.open(res.url, "_blank", "noopener");
    return;
  }
  if (!res.ok) {
    let message = "Couldn't generate the PDF. Please try again.";
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
    } catch { /* keep the default */ }
    throw new Error(message);
  }

  const match = /filename="?([^";]+)"?/i.exec(res.headers.get("content-disposition") ?? "");
  const filename = match?.[1] ?? "LR.pdf";

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
