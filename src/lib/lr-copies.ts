/**
 * Which LR copies a PDF should contain.
 *
 *   ?copies=consignor,consignee,driver   one page per copy, each labelled
 *   ?copies=all                          consignor + consignee + driver
 *   (no param)                           a single page with no copy label
 *
 * Keep this file free of server-only imports — the list page uses it too.
 */
export const LR_COPY_LABELS = {
  consignor: "CONSIGNOR COPY",
  consignee: "CONSIGNEE COPY",
  driver: "LORRY COPY",
  file: "FILE COPY",
} as const;

export type LrCopyKey = keyof typeof LR_COPY_LABELS;

/** The three copies handed out with a consignment. */
export const LR_STANDARD_COPIES: readonly LrCopyKey[] = ["consignor", "consignee", "driver"];

const ALIASES: Record<string, LrCopyKey> = {
  consignor: "consignor",
  consigner: "consignor",
  consignee: "consignee",
  driver: "driver",
  lorry: "driver",
  file: "file",
  office: "file",
};

export type ParsedCopies =
  | { ok: true; copies: LrCopyKey[] }
  | { ok: false; message: string };

/** `copies` is the raw query-string value. An empty list means "one unlabelled copy". */
export function parseCopies(raw: string | null | undefined): ParsedCopies {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return { ok: true, copies: [] };
  if (value === "all") return { ok: true, copies: [...LR_STANDARD_COPIES] };

  const copies: LrCopyKey[] = [];
  const unknown: string[] = [];
  for (const token of value.split(",").map((t) => t.trim()).filter(Boolean)) {
    const key = ALIASES[token];
    if (!key) unknown.push(token);
    else if (!copies.includes(key)) copies.push(key);
  }
  if (unknown.length > 0 || copies.length === 0) {
    return {
      ok: false,
      message: `Unknown copy type${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ") || value}. Use consignor, consignee, driver, file or all.`,
    };
  }
  return { ok: true, copies };
}

/** Relative URL of an LR's PDF, e.g. `/api/admin/consignments/<id>/pdf?copies=all`. */
export function lrPdfPath(id: string, copies?: string | readonly LrCopyKey[]): string {
  const base = `/api/admin/consignments/${encodeURIComponent(id)}/pdf`;
  const value = Array.isArray(copies) ? copies.join(",") : (copies as string | undefined);
  return value ? `${base}?copies=${encodeURIComponent(value)}` : base;
}
