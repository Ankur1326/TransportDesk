/**
 * Dashboard period maths. PURE: no I/O, no `new Date()` without an argument,
 * browser-safe. Every calendar decision ("today", "this month", the financial
 * year) is made in Asia/Kolkata (IST, UTC+05:30, no daylight saving).
 *
 * Windows are HALF-OPEN: `[from, to)`. `to` is the first instant AFTER the
 * period, so a query is `{ $gte: from, $lt: to }` and nothing is double
 * counted at a midnight boundary.
 *
 * Indian financial year: 1 April - 31 March. Weeks start on Monday.
 */

export const DASHBOARD_TIMEZONE = "Asia/Kolkata";

/** IST is a fixed +05:30 offset (India has no DST), so plain offset maths is exact. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Longest custom range accepted, in calendar months. */
export const MAX_RANGE_MONTHS = 24;

export const PERIOD_KEYS = ["today", "week", "month", "last_month", "fy", "custom"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];
export const DEFAULT_PERIOD: PeriodKey = "month";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  last_month: "Last month",
  fy: "This financial year",
  custom: "Custom range",
};

/** Calendar parts of an instant as seen in IST. `month` is 0-11. `weekday` is 0 (Sunday) - 6. */
export interface IstParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
}

export function istParts(date: Date): IstParts {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** The instant at which the IST calendar day `year-month-day` begins. Overflowing months/days roll over. */
export function istStartOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS);
}

/** Start (00:00 IST) of the IST day containing `date`. */
export function startOfIstDay(date: Date): Date {
  const p = istParts(date);
  return istStartOfDay(p.year, p.month, p.day);
}

/** Start of the IST month containing `date`, moved by `monthOffset` months. */
export function startOfIstMonth(date: Date, monthOffset = 0): Date {
  const p = istParts(date);
  return istStartOfDay(p.year, p.month + monthOffset, 1);
}

/** Monday 00:00 IST of the week containing `date`. */
export function startOfIstWeek(date: Date): Date {
  const p = istParts(date);
  const sinceMonday = (p.weekday + 6) % 7;
  return istStartOfDay(p.year, p.month, p.day - sinceMonday);
}

export interface FinancialYear {
  /** Calendar year in which the FY starts (FY 2026-27 -> 2026). */
  startYear: number;
  label: string;
  from: Date;
  /** First instant of the next FY (exclusive). */
  to: Date;
}

/** Financial year (April-March) containing `date`, in IST. */
export function financialYearOf(date: Date): FinancialYear {
  const p = istParts(date);
  const startYear = p.month >= 3 ? p.year : p.year - 1;
  return financialYearStarting(startYear);
}

export function financialYearStarting(startYear: number): FinancialYear {
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return {
    startYear,
    label: `FY ${startYear}-${endYY}`,
    from: istStartOfDay(startYear, 3, 1),
    to: istStartOfDay(startYear + 1, 3, 1),
  };
}

/* ------------------------------ ymd helpers ------------------------------- */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a strict `YYYY-MM-DD` calendar date (rejects 2026-02-30). Returns the IST start of that day, or null. */
export function parseIstDate(value: string | null | undefined): Date | null {
  const m = YMD.exec(value ?? "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const date = istStartOfDay(y, mo, d);
  const p = istParts(date);
  return p.year === y && p.month === mo && p.day === d ? date : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` of the IST day containing `date`. */
export function toIstYmd(date: Date): string {
  const p = istParts(date);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/* --------------------------------- periods -------------------------------- */

export interface ResolvedPeriod {
  key: PeriodKey;
  label: string;
  /** Inclusive start. */
  from: Date;
  /** Exclusive end. */
  to: Date;
  /** The equivalent earlier window, same elapsed length (see previousWindow). */
  previousFrom: Date;
  previousTo: Date;
  /** "yesterday", "last month", ... for the "vs previous period" tooltip. */
  compareLabel: string;
  /** `YYYY-MM-DD` of the first and last IST day of the window (both inclusive). */
  fromYmd: string;
  toYmd: string;
}

export type PeriodError = { ok: false; message: string };
export type PeriodResult = { ok: true; period: ResolvedPeriod } | PeriodError;

const fail = (message: string): PeriodError => ({ ok: false, message });

/** `from` moved forward by whole calendar months in IST. */
export function addIstMonths(from: Date, months: number): Date {
  const p = istParts(from);
  return istStartOfDay(p.year, p.month + months, p.day);
}

/**
 * The previous window mirrors how much of the current one has elapsed, so a
 * month that is 10 days old is compared with the first 10 days of last month
 * rather than a whole one (which would make every delta look like a crash).
 * It never runs past the end of the previous calendar period.
 */
function previousWindow(
  from: Date,
  to: Date,
  prevFrom: Date,
  prevTo: Date,
  now: Date
): { previousFrom: Date; previousTo: Date } {
  const elapsedEnd = Math.min(to.getTime(), Math.max(from.getTime(), now.getTime()));
  const elapsed = elapsedEnd - from.getTime();
  return { previousFrom: prevFrom, previousTo: new Date(Math.min(prevTo.getTime(), prevFrom.getTime() + elapsed)) };
}

/**
 * Resolve a period key (and, for "custom", an inclusive `YYYY-MM-DD` range)
 * into concrete IST windows. `now` is injected so results are reproducible.
 */
export function resolvePeriod(
  key: PeriodKey,
  now: Date,
  custom?: { from?: string | null; to?: string | null }
): PeriodResult {
  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;
  let compareLabel: string;
  let customDays = 0;

  switch (key) {
    case "today": {
      from = startOfIstDay(now);
      to = new Date(from.getTime() + DAY_MS);
      prevFrom = new Date(from.getTime() - DAY_MS);
      prevTo = from;
      compareLabel = "yesterday";
      break;
    }
    case "week": {
      from = startOfIstWeek(now);
      to = new Date(from.getTime() + 7 * DAY_MS);
      prevFrom = new Date(from.getTime() - 7 * DAY_MS);
      prevTo = from;
      compareLabel = "last week";
      break;
    }
    case "month": {
      from = startOfIstMonth(now);
      to = startOfIstMonth(now, 1);
      prevFrom = startOfIstMonth(now, -1);
      prevTo = from;
      compareLabel = "last month";
      break;
    }
    case "last_month": {
      from = startOfIstMonth(now, -1);
      to = startOfIstMonth(now);
      prevFrom = startOfIstMonth(now, -2);
      prevTo = from;
      compareLabel = "the month before";
      break;
    }
    case "fy": {
      const fy = financialYearOf(now);
      const prev = financialYearStarting(fy.startYear - 1);
      from = fy.from;
      to = fy.to;
      prevFrom = prev.from;
      prevTo = prev.to;
      compareLabel = "last financial year";
      break;
    }
    case "custom": {
      const f = parseIstDate(custom?.from);
      const t = parseIstDate(custom?.to);
      if (!f || !t) return fail("Pick a valid start and end date (YYYY-MM-DD).");
      if (f.getTime() > t.getTime()) return fail("The start date must not be after the end date.");
      from = f;
      to = new Date(t.getTime() + DAY_MS);
      if (to.getTime() > addIstMonths(from, MAX_RANGE_MONTHS).getTime()) {
        return fail(`Choose a range of at most ${MAX_RANGE_MONTHS} months.`);
      }
      customDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
      prevTo = from;
      prevFrom = new Date(from.getTime() - customDays * DAY_MS);
      compareLabel = "the previous range";
      break;
    }
  }

  // A custom range is compared with the same number of days straight before it, in full.
  const prev =
    key === "custom"
      ? { previousFrom: prevFrom, previousTo: prevTo }
      : previousWindow(from, to, prevFrom, prevTo, now);

  return {
    ok: true,
    period: {
      key,
      label: PERIOD_LABELS[key],
      from,
      to,
      ...prev,
      compareLabel,
      fromYmd: toIstYmd(from),
      toYmd: toIstYmd(new Date(to.getTime() - 1)),
    },
  };
}

/** Whole IST calendar days from `earlier` to `later` (0 when the same IST day, never negative). */
export function istDaysBetween(earlier: Date, later: Date): number {
  const diff = startOfIstDay(later).getTime() - startOfIstDay(earlier).getTime();
  return Math.max(0, Math.round(diff / DAY_MS));
}

/* --------------------------------- buckets -------------------------------- */

export interface TrendBucket {
  /** Stable key: `YYYY-MM` for months, `YYYY-MM-DD` (first day) for days and weeks. */
  key: string;
  label: string;
  from: Date;
  to: Date;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Months fully or partly inside the window `[from, to)`, oldest first. */
function monthBuckets(from: Date, to: Date): TrendBucket[] {
  const out: TrendBucket[] = [];
  let cursor = startOfIstMonth(from);
  while (cursor.getTime() < to.getTime()) {
    const next = startOfIstMonth(cursor, 1);
    const p = istParts(cursor);
    out.push({
      key: `${p.year}-${pad(p.month + 1)}`,
      label: `${MONTH_SHORT[p.month]} ${String(p.year).slice(2)}`,
      from: cursor,
      to: next,
    });
    cursor = next;
  }
  return out;
}

/**
 * Month buckets for the "Revenue vs hire cost" chart: every month of the
 * period when it spans more than one calendar month, otherwise the last 6
 * months ending with the month the period ends in (never later than now).
 */
export function revenueBuckets(period: ResolvedPeriod, now: Date): TrendBucket[] {
  const lastInstant = new Date(Math.min(period.to.getTime() - 1, now.getTime()));
  const spanMonths = monthBuckets(period.from, period.to).length;
  if (spanMonths > 1) {
    // Do not draw months that have not started yet (the rest of the current FY).
    return monthBuckets(period.from, new Date(lastInstant.getTime() + 1));
  }
  const endMonth = startOfIstMonth(lastInstant);
  return monthBuckets(startOfIstMonth(endMonth, -5), startOfIstMonth(endMonth, 1));
}

/**
 * Day buckets when the window is at most 31 days, else Monday-start week
 * buckets clipped to the window. Used by the "Collections" trend.
 */
export function collectionBuckets(period: ResolvedPeriod): { unit: "day" | "week"; buckets: TrendBucket[] } {
  const days = Math.round((period.to.getTime() - period.from.getTime()) / DAY_MS);
  const buckets: TrendBucket[] = [];

  if (days <= 31) {
    for (let i = 0; i < days; i++) {
      const from = new Date(period.from.getTime() + i * DAY_MS);
      const p = istParts(from);
      buckets.push({ key: toIstYmd(from), label: `${p.day} ${MONTH_SHORT[p.month]}`, from, to: new Date(from.getTime() + DAY_MS) });
    }
    return { unit: "day", buckets };
  }

  let cursor = startOfIstWeek(period.from);
  while (cursor.getTime() < period.to.getTime()) {
    const next = new Date(cursor.getTime() + 7 * DAY_MS);
    const from = new Date(Math.max(cursor.getTime(), period.from.getTime()));
    const to = new Date(Math.min(next.getTime(), period.to.getTime()));
    const p = istParts(from);
    buckets.push({ key: toIstYmd(from), label: `${p.day} ${MONTH_SHORT[p.month]}`, from, to });
    cursor = next;
  }
  return { unit: "week", buckets };
}

/** Index of the bucket containing `instant`, or -1. Buckets are sorted and contiguous. */
export function bucketIndex(buckets: readonly TrendBucket[], instant: Date): number {
  const t = instant.getTime();
  return buckets.findIndex((b) => t >= b.from.getTime() && t < b.to.getTime());
}
