/**
 * Which LR copies a PDF should contain.
 *
 *   ?copies=consignor,consignee,driver   one page per copy, each labelled
 *   ?copies=all                          transporter + consignor + consignee + driver
 *   (no param)                           a single page with no copy label
 *
 * Keep this file free of server-only imports — the list page uses it too.
 */
export const LR_COPY_LABELS = {
  transporter: "TRANSPORTER COPY",
  consignor: "CONSIGNOR COPY",
  consignee: "CONSIGNEE COPY",
  driver: "LORRY COPY",
} as const;

export type LrCopyKey = keyof typeof LR_COPY_LABELS;

/** Every copy of a consignment, in the order the Share dialog lists them. */
export const LR_STANDARD_COPIES: readonly LrCopyKey[] = ["transporter", "consignor", "consignee", "driver"];

const ALIASES: Record<string, LrCopyKey> = {
  consignor: "consignor",
  consigner: "consignor",
  consignee: "consignee",
  driver: "driver",
  lorry: "driver",
  transporter: "transporter",
  file: "transporter",
  office: "transporter",
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
      message: `Unknown copy type${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ") || value}. Use transporter, consignor, consignee, driver or all.`,
    };
  }
  return { ok: true, copies };
}

/** Relative URL of an LR's PDF, e.g. `/api/admin/consignments/<id>/pdf?copies=all`. */
export function lrPdfPath(
  id: string,
  copies?: string | readonly LrCopyKey[],
  opts?: { download?: boolean }
): string {
  const base = `/api/admin/consignments/${encodeURIComponent(id)}/pdf`;
  const value = Array.isArray(copies) ? copies.join(",") : (copies as string | undefined);
  const params: string[] = [];
  if (value) params.push(`copies=${encodeURIComponent(value)}`);
  if (opts?.download) params.push("download=1");
  return params.length ? `${base}?${params.join("&")}` : base;
}
