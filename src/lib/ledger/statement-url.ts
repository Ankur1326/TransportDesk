import { openStoredPdf } from "@/lib/pdf-url";
import type { LedgerFilterState } from "@/redux/slices/ledgerSlice";

/** The part of the ledger filters a statement honours (it is always complete: no type / search filter). */
export type StatementRange = Pick<LedgerFilterState, "from" | "to" | "includeUnbilled">;

/** Relative URL of a customer's statement PDF, e.g. `/api/admin/customer/ledger/<id>/statement?from=...`. */
export function statementPdfPath(customerId: string, range: StatementRange, opts?: { download?: boolean }): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  params.set("includeUnbilled", String(range.includeUnbilled));
  if (opts?.download) params.set("download", "1");
  return `/api/admin/customer/ledger/${encodeURIComponent(customerId)}/statement?${params.toString()}`;
}

/** Opens the statement in a new tab (spinner first, then the PDF). Statements are built fresh, never stored. */
export const openStatementPdf = (customerId: string, range: StatementRange) =>
  openStoredPdf({ _id: customerId }, { routePath: statementPdfPath(customerId, range), label: "statement" });

/** 10-digit Indian mobile -> 91XXXXXXXXXX for wa.me; null when it can't be a number. */
export function whatsappNumber(mobile: string | null | undefined): string | null {
  const digits = (mobile ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

export const whatsappLink = (mobile: string | null | undefined, text: string): string => {
  const number = whatsappNumber(mobile);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
};

export interface ShareStatementInput {
  customerId: string;
  customerName: string;
  mobile: string | null | undefined;
  range: StatementRange;
  /** Text sent along with the PDF, or alone when the file can't be attached. */
  message: string;
}

/**
 * Shares the statement PDF. Phones that can share files get the real PDF in
 * the share sheet (pick WhatsApp). Elsewhere the PDF is downloaded and
 * WhatsApp opens with the message, so the file can be attached by hand.
 * The PDF is never put on a public link: it is private financial data.
 */
export async function shareStatementOnWhatsApp(input: ShareStatementInput): Promise<"shared" | "downloaded"> {
  const res = await fetch(statementPdfPath(input.customerId, input.range, { download: true }), { credentials: "same-origin" });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/pdf")) {
    throw new Error("Couldn't prepare the statement. Please try again.");
  }
  const blob = await res.blob();
  const fileName = `Statement-${input.customerName.replace(/[^\w.-]+/g, "_")}.pdf`;
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: input.message });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "shared"; // user closed the sheet
      // anything else: fall through to download + wa.me
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  window.open(whatsappLink(input.mobile, input.message), "_blank", "noopener");
  return "downloaded";
}
