import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addIstMonths, bucketIndex, collectionBuckets, financialYearOf, istDaysBetween, istParts, parseIstDate,
  resolvePeriod, revenueBuckets, startOfIstDay, startOfIstMonth, startOfIstWeek, toIstYmd,
  type PeriodKey, type ResolvedPeriod,
} from "../periods";

const iso = (d: Date) => d.toISOString();
/** An IST wall-clock time as a UTC instant. */
const ist = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi) - (5 * 60 + 30) * 60_000);

function period(key: PeriodKey, now: Date, custom?: { from?: string; to?: string }): ResolvedPeriod {
  const r = resolvePeriod(key, now, custom);
  assert.equal(r.ok, true, r.ok ? "" : r.message);
  return r.ok ? r.period : (undefined as never);
}

test("IST day boundary: 23:59:59 IST and 00:00:00 IST fall on different days", () => {
  const lastSecond = new Date("2026-11-03T18:29:59.999Z"); // 23:59:59.999 IST, 3 Nov
  const midnight = new Date("2026-11-03T18:30:00.000Z"); // 00:00 IST, 4 Nov
  assert.equal(toIstYmd(lastSecond), "2026-11-03");
  assert.equal(toIstYmd(midnight), "2026-11-04");
  assert.equal(iso(startOfIstDay(lastSecond)), "2026-11-02T18:30:00.000Z");
  assert.equal(iso(startOfIstDay(midnight)), "2026-11-03T18:30:00.000Z");
});

test("a UTC date that is still yesterday in UTC is already today in IST", () => {
  // 02:00 IST on 1 Dec is 20:30 UTC on 30 Nov.
  const now = ist(2026, 12, 1, 2, 0);
  assert.equal(iso(now), "2026-11-30T20:30:00.000Z");
  const p = period("month", now);
  assert.equal(p.fromYmd, "2026-12-01");
});

test("today: the whole IST day, previous window is yesterday up to the same time", () => {
  const now = ist(2026, 11, 3, 15, 0);
  const p = period("today", now);
  assert.equal(iso(p.from), iso(ist(2026, 11, 3)));
  assert.equal(iso(p.to), iso(ist(2026, 11, 4)));
  assert.equal(iso(p.previousFrom), iso(ist(2026, 11, 2)));
  assert.equal(iso(p.previousTo), iso(ist(2026, 11, 2, 15, 0)));
  assert.equal(p.compareLabel, "yesterday");
});

test("week starts on Monday (IST), including when today is Sunday", () => {
  // 3 Nov 2026 is a Tuesday.
  assert.equal(toIstYmd(startOfIstWeek(ist(2026, 11, 3, 10))), "2026-11-02");
  // Sunday 8 Nov belongs to the week that began Monday 2 Nov.
  assert.equal(istParts(ist(2026, 11, 8, 10)).weekday, 0);
  assert.equal(toIstYmd(startOfIstWeek(ist(2026, 11, 8, 10))), "2026-11-02");
  // Monday 00:00 IST itself
  assert.equal(toIstYmd(startOfIstWeek(ist(2026, 11, 9, 0, 0))), "2026-11-09");
  const p = period("week", ist(2026, 11, 3, 10));
  assert.equal(p.fromYmd, "2026-11-02");
  assert.equal(p.toYmd, "2026-11-08");
});

test("month: first to last day, 30 vs 31 vs February (leap year)", () => {
  const nov = period("month", ist(2026, 11, 15));
  assert.equal(nov.fromYmd, "2026-11-01");
  assert.equal(nov.toYmd, "2026-11-30");
  assert.equal(period("month", ist(2026, 12, 31, 23, 59)).toYmd, "2026-12-31");
  assert.equal(period("month", ist(2028, 2, 10)).toYmd, "2028-02-29");
  assert.equal(period("month", ist(2027, 2, 10)).toYmd, "2027-02-28");
});

test("last month, including across the new year", () => {
  const p = period("last_month", ist(2026, 1, 10));
  assert.equal(p.fromYmd, "2025-12-01");
  assert.equal(p.toYmd, "2025-12-31");
  assert.equal(p.label, "Last month");
  assert.equal(period("last_month", ist(2026, 3, 1)).toYmd, "2026-02-28");
});

test("financial year: 31 March and 1 April land in different years (IST)", () => {
  assert.equal(financialYearOf(ist(2027, 3, 31, 23, 59)).label, "FY 2026-27");
  assert.equal(financialYearOf(ist(2027, 4, 1, 0, 0)).label, "FY 2027-28");
  // 18:30 UTC on 31 March is already 1 April in IST.
  assert.equal(financialYearOf(new Date("2027-03-31T18:30:00Z")).label, "FY 2027-28");
  assert.equal(financialYearOf(new Date("2027-03-31T18:29:59Z")).label, "FY 2026-27");
  const fy = financialYearOf(ist(2026, 11, 3));
  assert.equal(iso(fy.from), iso(ist(2026, 4, 1)));
  assert.equal(iso(fy.to), iso(ist(2027, 4, 1)));
  assert.equal(financialYearOf(ist(2099, 6, 1)).label, "FY 2099-00");
});

test("fy period: from 1 April to 31 March, previous is the whole previous FY capped by elapsed time", () => {
  const now = ist(2026, 11, 3, 12);
  const p = period("fy", now);
  assert.equal(p.fromYmd, "2026-04-01");
  assert.equal(p.toYmd, "2027-03-31");
  assert.equal(p.previousFrom.getTime(), ist(2025, 4, 1).getTime());
  assert.equal(p.previousTo.getTime(), ist(2025, 4, 1).getTime() + (now.getTime() - ist(2026, 4, 1).getTime()));
  // January 2027 is still FY 2026-27
  assert.equal(period("fy", ist(2027, 1, 15)).fromYmd, "2026-04-01");
});

test("previous window mirrors the elapsed part of the month and never passes the end of the previous month", () => {
  // 10th of November, noon: previous = 1 Oct .. 10 Oct noon
  const p = period("month", ist(2026, 11, 10, 12));
  assert.equal(iso(p.previousFrom), iso(ist(2026, 10, 1)));
  assert.equal(iso(p.previousTo), iso(ist(2026, 10, 10, 12)));
  // 31 March: the previous month (February) only has 28 days, so it is capped at 1 March
  const m = period("month", ist(2026, 3, 31, 12));
  assert.equal(iso(m.previousFrom), iso(ist(2026, 2, 1)));
  assert.equal(iso(m.previousTo), iso(ist(2026, 3, 1)));
  // A finished month is compared in full
  const last = period("last_month", ist(2026, 11, 10));
  assert.equal(iso(last.previousFrom), iso(ist(2026, 9, 1)));
  assert.equal(iso(last.previousTo), iso(ist(2026, 10, 1)));
});

test("custom range: inclusive end day, previous is the same number of days before", () => {
  const p = period("custom", ist(2026, 11, 3), { from: "2026-10-10", to: "2026-10-19" });
  assert.equal(p.fromYmd, "2026-10-10");
  assert.equal(p.toYmd, "2026-10-19");
  assert.equal(iso(p.to), iso(ist(2026, 10, 20)));
  assert.equal(iso(p.previousFrom), iso(ist(2026, 9, 30)));
  assert.equal(iso(p.previousTo), iso(ist(2026, 10, 10)));
  assert.equal(period("custom", ist(2026, 11, 3), { from: "2026-10-10", to: "2026-10-10" }).toYmd, "2026-10-10");
});

test("custom range validation", () => {
  const bad = (from?: string, to?: string) => resolvePeriod("custom", ist(2026, 11, 3), { from, to });
  assert.deepEqual(bad("2026-10-20", "2026-10-10"), { ok: false, message: "The start date must not be after the end date." });
  assert.equal(bad(undefined, "2026-10-10").ok, false);
  assert.equal(bad("2026-10-10", undefined).ok, false);
  assert.equal(bad("2026-02-30", "2026-03-10").ok, false, "impossible calendar date");
  assert.equal(bad("26-10-10", "2026-10-11").ok, false);
  // 24 months is fine, one day more is not
  assert.equal(bad("2025-01-01", "2026-12-31").ok, true);
  const tooLong = bad("2025-01-01", "2027-01-01");
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.ok ? "" : tooLong.message, /24 months/);
  assert.equal(bad("2024-02-29", "2026-02-28").ok, true);
});

test("parseIstDate and addIstMonths", () => {
  assert.equal(iso(parseIstDate("2026-11-03")!), "2026-11-02T18:30:00.000Z");
  assert.equal(parseIstDate("2026-13-01"), null);
  assert.equal(parseIstDate(""), null);
  assert.equal(parseIstDate(null), null);
  assert.equal(toIstYmd(addIstMonths(ist(2026, 1, 15), 24)), "2028-01-15");
});

test("istDaysBetween counts IST calendar days, not 24h blocks", () => {
  // 23:00 IST to 01:00 IST the next day is 2 hours but 1 calendar day
  assert.equal(istDaysBetween(ist(2026, 11, 3, 23, 0), ist(2026, 11, 4, 1, 0)), 1);
  assert.equal(istDaysBetween(ist(2026, 11, 3, 1, 0), ist(2026, 11, 3, 23, 0)), 0);
  assert.equal(istDaysBetween(ist(2026, 11, 5), ist(2026, 11, 3)), 0, "never negative");
});

test("month start helper moves by calendar months", () => {
  assert.equal(toIstYmd(startOfIstMonth(ist(2026, 1, 20), -1)), "2025-12-01");
  assert.equal(toIstYmd(startOfIstMonth(ist(2026, 12, 20), 1)), "2027-01-01");
});

test("revenueBuckets: short periods show the last 6 months ending with the period's month", () => {
  const now = ist(2026, 11, 3);
  const b = revenueBuckets(period("month", now), now);
  assert.deepEqual(b.map((x) => x.key), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  const last = revenueBuckets(period("last_month", now), now);
  assert.equal(last.at(-1)?.key, "2026-10");
  assert.equal(last.length, 6);
  const today = revenueBuckets(period("today", now), now);
  assert.equal(today.at(-1)?.key, "2026-11");
  assert.equal(b[0].label, "Jun 26");
});

test("revenueBuckets: a financial year shows its months up to now, not the future", () => {
  const now = ist(2026, 11, 3);
  const b = revenueBuckets(period("fy", now), now);
  assert.deepEqual(b.map((x) => x.key), ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  const r = revenueBuckets(period("custom", now, { from: "2026-08-15", to: "2026-10-05" }), now);
  assert.deepEqual(r.map((x) => x.key), ["2026-08", "2026-09", "2026-10"]);
});

test("collectionBuckets: days up to 31 days, weeks beyond, clipped to the window", () => {
  const now = ist(2026, 11, 3);
  const d = collectionBuckets(period("month", now));
  assert.equal(d.unit, "day");
  assert.equal(d.buckets.length, 30);
  assert.equal(d.buckets[0].key, "2026-11-01");

  const w = collectionBuckets(period("custom", now, { from: "2026-10-01", to: "2026-11-15" }));
  assert.equal(w.unit, "week");
  assert.equal(toIstYmd(w.buckets[0].from), "2026-10-01"); // clipped, not the Monday before
  assert.equal(toIstYmd(w.buckets[1].from), "2026-10-05"); // first Monday after
  const last = w.buckets.at(-1)!;
  assert.equal(iso(last.to), iso(ist(2026, 11, 16)));
  // contiguous
  for (let i = 1; i < w.buckets.length; i++) assert.equal(w.buckets[i].from.getTime(), w.buckets[i - 1].to.getTime());
});

test("bucketIndex finds the half-open bucket", () => {
  const { buckets } = collectionBuckets(period("month", ist(2026, 11, 3)));
  assert.equal(bucketIndex(buckets, ist(2026, 11, 1, 0, 0)), 0);
  assert.equal(bucketIndex(buckets, ist(2026, 11, 1, 23, 59)), 0);
  assert.equal(bucketIndex(buckets, ist(2026, 11, 2, 0, 0)), 1);
  assert.equal(bucketIndex(buckets, ist(2026, 12, 1, 0, 0)), -1);
});
