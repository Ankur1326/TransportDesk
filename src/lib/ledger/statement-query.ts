import { z } from "zod";

/** YYYY-MM-DD or empty. */
const day = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date")
  .or(z.literal(""))
  .default("");

const schema = z.object({
  from: day,
  to: day,
  includeUnbilled: z.enum(["true", "false"]).default("true"),
});

export interface StatementQuery {
  from: string;
  to: string;
  fromDate: Date | null;
  /** End of the `to` day (inclusive). */
  toDate: Date | null;
  includeUnbilled: boolean;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Validates the statement's query string (shared by the PDF route and the print page). null = invalid. */
export function parseStatementQuery(raw: Record<string, string | string[] | undefined>): StatementQuery | null {
  const parsed = schema.safeParse({
    from: first(raw.from),
    to: first(raw.to),
    includeUnbilled: first(raw.includeUnbilled),
  });
  if (!parsed.success) return null;
  const { from, to, includeUnbilled } = parsed.data;
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1) : null;
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) return null;
  return { from, to, fromDate, toDate, includeUnbilled: includeUnbilled === "true" };
}
